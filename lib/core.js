'use strict';

const common = require('x2node-common');


/**
 * Regular expression pattern for the scalar value type specification.
 *
 * @private
 * @type {string}
 */
const SCALAR_VALUE_TYPE_PATTERN =
	'(string|number|boolean|datetime)|(object)\\??|(ref)\\(\\s*\\S.*\\)';

/**
 * Regular expression for parsing property value type specifications.
 *
 * @private
 * @type {external:RegExp}
 */
const VALUE_TYPE_RE = new RegExp(
	'^\\s*(?:' +
		SCALAR_VALUE_TYPE_PATTERN +
		'|\\[\\s*(?:' + SCALAR_VALUE_TYPE_PATTERN + ')\\s*\\]' +
		'|\\{\\s*(?:' + SCALAR_VALUE_TYPE_PATTERN + ')\\s*\\}' +
	')\\s*$'
);

/**
 * Regular expression for parsing map key value type specifications.
 *
 * @private
 * @type {external:RegExp}
 */
const KEY_VALUE_TYPE_RE = new RegExp(
	'^(string|number|boolean|datetime)|(ref)\\(\\s*([^|\\s]+)\\s*\\)$');

/**
 * Get invalid property definition error.
 *
 * @private
 * @param {module:x2node-records~PropertyDescriptor} propDesc Property
 * descriptor.
 * @param {string} msg Error message.
 * @returns {module:x2node-common.X2UsageError} Error to throw.
 */
function invalidDef(propDesc, msg) {
	return new common.X2UsageError(
		'Property ' + propDesc.container.nestedPath + propDesc.name +
			' of record type ' + String(propDesc.container.recordTypeName) +
			' has invalid definition: ' + msg);
}

/**
 * Process key property name definition attribute and set the property
 * descriptor's key property value type and reference target accordingly.
 *
 * @private
 * @param {module:x2node-records~PropertyDescriptor} propDesc Map property
 * descriptor.
 * @param {module:x2node-records~PropertiesContainer} keyPropContainer Container
 * of the key property.
 * @returns {module:x2node-records~PropertyDescriptor} The map property
 * descriptor.
 */
function processKeyProperty(propDesc, keyPropContainer) {

	// get the key property descriptor
	const keyPropName = propDesc._keyPropertyName;
	if (!keyPropContainer.hasProperty(keyPropName))
		throw invalidDef(
			propDesc,
			'key property ' + keyPropName +
				' not found among the target object properties.');
	const keyPropDesc = keyPropContainer.getPropertyDesc(keyPropName);

	// validate the key property type
	if (!keyPropDesc.isScalar() || keyPropDesc.isPolymorph() ||
		(keyPropDesc.scalarValueType === 'object'))
		throw invalidDef(
			propDesc,
			'key property ' + keyPropName +
				' is not scalar, is a nested object, or is polymoprhic.');

	// set key value type in the map property descriptor
	propDesc._keyValueType = keyPropDesc.scalarValueType;
	if (keyPropDesc.isRef())
		propDesc._keyRefTarget = keyPropDesc.refTarget;

	// return the map property descriptor
	return propDesc;
}

/**
 * Create object factory.
 *
 * @private
 * @param {Object} objDef Object definition.
 * @returns {Function} The factory function.
 */
function createObjectFactory(objDef) {
	return (
		objDef.factory ? objDef.factory :
			function() {
				return new Object();
			}
	);
}

/**
 * Extension that implements the core functionaity.
 *
 * @private
 * @memberof module:x2node-records
 * @inner
 * @implements {module:x2node-records.Extension}
 */
class CoreExtention {

	// implementation
	extendPropertiesContainer(ctx, container) {

		// create records factory
		container._factory = createObjectFactory(container.definition);

		// find the id property
		ctx.onContainerComplete(container => {
			let idPropName;
			container.allPropertyNames.forEach(propName => {
				if (container.getPropertyDesc(propName).isId()) {
					if (idPropName)
						throw new common.X2UsageError(
							'Record type ' + String(container.recordTypeName) + (
								container.nestedPath.length > 0 ?
									' property ' + container.nestedPath : '') +
								' has more than one id property.');
					idPropName = propName;
				}
			});
			if (idPropName)
				container._idPropName = idPropName;
		});

		// record type specific logic
		if (container.nestedPath.length === 0) {

			// add id validation if record type
			ctx.onLibraryValidation(() => {
				if (!container.idPropertyName)
					throw new common.X2UsageError(
						'Record type ' + String(container.recordTypeName) +
							' does not have an id property.');
			});

			// add properties and methods to the descriptor:

			/**
			 * Create new record instance of this type.
			 *
			 * @function module:x2node-records~RecordTypeDescriptor#newRecord
			 * @returns {Object} New record instance.
			 */
			container.newRecord = function() {
				return this._factory.call(this._definition);
			};
		}

		// return the container
		return container;
	}

	// implementation
	extendPropertyDescriptor(ctx, propDesc) {

		// get the definition
		const propDef = propDesc.definition;

		// parse the value type
		let match = VALUE_TYPE_RE.exec(propDef.valueType);
		if (match === null)
			throw invalidDef(
				propDesc, 'unknown value type or invalid value type syntax.');
		propDesc._scalarValueType = match.find((val, ind) => ((ind > 0) && val));

		// determine whether scalar, array or map
		propDesc._isScalar = !(/^\s*[\[\{]/.test(propDef.valueType));
		propDesc._isArray =
			(!propDesc._isScalar && (/^\s*\[/.test(propDef.valueType)));
		propDesc._isMap =
			(!propDesc._isScalar && (/^\s*\{/.test(propDef.valueType)));

		// determine if optional
		propDesc._optional = (
			propDef.optional === undefined ?
				!propDesc._isScalar : propDef.optional);

		// determine if id property
		propDesc._isId = (propDef.role === 'id');
		if (propDesc._isId && !(propDesc._isScalar && (
			propDesc._scalarValueType === 'number' ||
				propDesc._scalarValueType === 'string')))
			throw invalidDef(
				propDesc,
				'id property may only be a scalar string or a number.');

		// determine if polymorph object
		propDesc._isPolymorphObject = /object\?/.test(propDef.valueType);
		if (propDesc._isPolymorphObject) {
			propDesc._typePropertyName = propDef.typePropertyName;
			if (!propDesc._typePropertyName)
				throw invalidDef(
					propDesc, 'missing typePropertyName attribute.');
		}

		// process reference property
		if (propDesc._scalarValueType === 'ref') {

			// extract and validate reference target record type(s)
			match = /\((.+)\)/.exec(propDef.valueType);
			const refTargets = match[1].trim().split(/\s*\|\s*/);

			// determine if polymorphic
			propDesc._isPolymorphRef = (refTargets.length > 1);
			if (propDesc._isPolymorphRef) {

				propDesc._scalarValueType = 'object';

				const supertypeDef = Object.create(propDef);
				superTypeDef.properties = {};
				refTargets.forEach(refTarget => {
					supertypeDef.properties[refTarget] = {
						valueType: 'ref(' + refTarget + ')',
						optional: true
					};
				});

				propDesc._nestedProperties = ctx.createPropertiesContainer(
					propDesc, supertypeDef);

				// TODO: process id and or map key properties

				propDesc._factory = createObjectFactory({});

			} else {

				propDesc._refTarget = refTargets[0];

				ctx.onLibraryValidation(recordTypes => {
					if (!recordTypes.hasRecordType(propDesc.refTarget))
						throw invalidDef(
							propDesc, 'unknown reference target record type.');
				});
			}
		}

		// process nested object property
		if ((propDesc._scalarValueType === 'object') && !this._isPolymorphRef) {

			// get/create nested properties container
			if (propDesc._viewOfDesc) {

				propDesc._nestedProperties = viewOfDesc._nestedProperties;

			} else if (this._isPolymorphObject) {

				if (!propDef.subtypes)
					throw invalidDef(propDesc, 'missing substypes.');

				const supertypeDef = Object.create(propDef);
				supertypeDef.properties = {};
				for (let subtypeName in propDef.subtypes) {
					const subtypePropDef = Object.create(
						propDef.subtypes[subtypeName]);
					subtypePropDef.valueType = 'object';
					subtypePropDef.optional = true;
					supertypeDef.properties[subtypeName] = subtypePropDef;
				}

				propDesc._nestedProperties = ctx.createPropertiesContainer(
					propDesc, supertypeDef);

				// TODO: process id and or map key properties

			} else {

				if (!propDef.properties)
					throw invalidDef(propDesc, 'missing properties.');

				propDesc._nestedProperties = ctx.createPropertiesContainer(
					propDesc, propDef);
			}

			// create object factory
			propDesc._factory = createObjectFactory(propDef);
		}

		// validate nested object id property
		if (propDesc._scalarValueType === 'object') {
			if (propDesc._isArray)
				ctx.onLibraryValidation(recordTypes => {
					if (!propDesc.nestedProperties.idPropertyName)
						throw invalidDef(propDesc, 'missing id property.');
				});
			else if (!propDesc._isMap)
				ctx.onLibraryValidation(recordTypes => {
					if (propDesc.nestedProperties.idPropertyName)
						throw invalidDef(
							propDesc, 'may not have an id property.');
				});
		}

		// process the map key attributes
		if (propDesc._isMap) {
			if (propDef.keyPropertyName) {
				if (propDef.keyValueType)
					throw invalidDef(
						propDesc,
						'cannot have both keyPropertyName and keyValueType' +
							' attributes.');
				propDesc._keyPropertyName = propDef.keyPropertyName;
				switch (propDesc._scalarValueType) {
				case 'object':
					if (propDesc._isPolymorphRef) {
						// TODO: implement
						throw new Error('Polymorphic references not implemented.');
					} else { // nested object
						ctx.onContainerComplete(
							container => (
								processKeyProperty(
									propDesc, propDesc.nestedProperties),
								container)
						);
					}
					break;
				case 'ref':
					ctx.onLibraryComplete(recordTypes => {
						if (!recordTypes.hasRecordType(propDesc.refTarget))
							throw invalidDef(
								propDesc,
								'unknown reference map key target record type.');
						processKeyProperty(
							propDesc, recordTypes.getPropertyDesc(
								propDesc.refTarget));
						return recordTypes;
					});
				}
			} else if (propDef.keyValueType) { // do we have key value type?
				const m = KEY_VALUE_TYPE_RE.exec(propDef.keyValueType);
				if (m === null)
					throw invalidDef(propDesc, 'invalid keyValueType property.');
				if (m[1]) { // non-reference key
					propDesc._keyValueType = m[1];
				} else { // reference key
					propDesc._keyValueType = m[2];
					propDesc._keyRefTarget = m[3];
				}
			}
			ctx.onLibraryValidation(recordTypes => {
				if (!propDesc.keyValueType)
					throw invalidDef(
						propDesc, 'map key value type is not specified.');
				if (propDesc.keyValueType === 'object')
					throw invalidDef(
						propDesc, 'map key value type may not be object.');
				if (propDesc.keyValueType === 'ref') {
					if (!propDesc.keyRefTarget)
						throw invalidDef(
							propDesc,
							'target record type of the reference map key is' +
								' not specified.');
					if (!recordTypes.hasRecordType(propDesc.keyRefTarget))
						throw invalidDef(
							propDesc,
							'unknown reference map key target record type.');
				}
			});
		}

		// add properties and methods to the descriptor:

		/**
		 * Scalar value type of the property. One of "string", "number",
		 * "boolean", "datetime", "object" or "ref".
		 *
		 * @member {string} module:x2node-records~PropertyDescriptor#scalarValueType
		 * @readonly
		 */
		Object.defineProperty(propDesc, 'scalarValueType', {
			get() { return this._scalarValueType; }
		});

		/**
		 * Tell if the property is scalar.
		 *
		 * @function module:x2node-records~PropertyDescriptor#isScalar
		 * @returns {boolean} <code>true</code> if the property is scalar.
		 */
		propDesc.isScalar = function() { return this._isScalar; };

		/**
		 * Tell if the property is an array.
		 *
		 * @function module:x2node-records~PropertyDescriptor#isArray
		 * @returns {boolean} <code>true</code> if the property is an array.
		 */
		propDesc.isArray = function() { return this._isArray; };

		/**
		 * Tell if the property is a map.
		 *
		 * @function module:x2node-records~PropertyDescriptor#isMap
		 * @returns {boolean} <code>true</code> if the property is a map.
		 */
		propDesc.isMap = function() { return this._isMap; };

		/**
		 * <code>true</code> if the property is optional.
		 *
		 * @member {boolean} module:x2node-records~PropertyDescriptor#optional
		 * @readonly
		 */
		Object.defineProperty(propDesc, 'optional', {
			get() { return this._optional; }
		});

		/**
		 * Tell if the property is a record or nested object id.
		 *
		 * @function module:x2node-records~PropertyDescriptor#isId
		 * @returns {boolean} <code>true</code> if the property is an id.
		 */
		propDesc.isId = function() { return this._isId; };

		/**
		 * Tell if the property is polymorphic nested object.
		 *
		 * @function module:x2node-records~PropertyDescriptor#isPolymorphObject
		 * @returns {boolean} <code>true</code> if the property is a polymorphic
		 * nested object.
		 */
		propDesc.isPolymorphObject =
			function() { return this._isPolymorphObject; };

		/**
		 * Tell if the property is polymorphic reference.
		 *
		 * @function module:x2node-records~PropertyDescriptor#isPolymorphRef
		 * @returns {boolean} <code>true</code> if the property is a polymorphic
		 * reference.
		 */
		propDesc.isPolymorphRef = function() { return this._isPolymorphRef; };

		/**
		 * Tell if the property is polymorphic nested object or reference.
		 *
		 * @function module:x2node-records~PropertyDescriptor#isPolymorph
		 * @returns {boolean} <code>true</code> if the property is a polymorphic
		 * nested object or reference.
		 */
		propDesc.isPolymorph = function() {
			return (this._isPolymorphObject || this._isPolymorphRef);
		};

		/**
		 * For a polymorphic nested object property, name of the property used as
		 * the concrete type discriminator.
		 *
		 * @member {string} module:x2node-records~PropertyDescriptor#typePropertyName
		 * @readonly
		 */
		Object.defineProperty(propDesc, 'typePropertyName', {
			get() { return this._typePropertyName; }
		});

		/**
		 * For a map property, scalar value type of the map key.
		 *
		 * @member {string} module:x2node-records~PropertyDescriptor#keyValueType
		 * @readonly
		 */
		Object.defineProperty(propDesc, 'keyValueType', {
			get() { return this._keyValueType; }
		});

		/**
		 * If <code>keyValueType</code> is a reference, the reference target
		 * record type name.
		 *
		 * @member {string} module:x2node-records~PropertyDescriptor#keyRefTarget
		 * @readonly
		 */
		Object.defineProperty(propDesc, 'keyRefTarget', {
			get() { return this._keyRefTarget; }
		});

		/**
		 * For a nested object or reference map property, name of the property in
		 * the nested object or the referred record that acts as the map key.
		 *
		 * @member {string} module:x2node-records~PropertyDescriptor#keyPropertyName
		 * @readonly
		 */
		Object.defineProperty(propDesc, 'keyPropertyName', {
			get() { return this._keyPropertyName; }
		});

		/**
		 * Tell if the property is a reference (<code>scalarValueType</code> is
		 * "ref").
		 *
		 * @function module:x2node-records~PropertyDescriptor#isRef
		 * @returns {boolean} <code>true</code> if the property is a reference.
		 */
		propDesc.isRef =
			function() { return (this._scalarValueType === 'ref'); };

		/**
		 * Name of the target record type for a reference property.
		 *
		 * @member {string} module:x2node-records~PropertyDescriptor#refTarget
		 * @readonly
		 */
		Object.defineProperty(propDesc, 'refTarget', {
			get() { return this._refTarget; }
		});

		/**
		 * For a nested object property (<code>scalarValueType</code> is
		 * "object"), the descriptors of the nested properties.
		 *
		 * @member {module:x2node-records~PropertiesContainer} module:x2node-records~PropertyDescriptor#nestedProperties
		 * @readonly
		 */
		Object.defineProperty(propDesc, 'nestedProperties', {
			get() { return this._nestedProperties; }
		});

		/**
		 * Create new nested object instance for a nested object property.
		 *
		 * @function module:x2node-records~PropertyDescriptor#newObject
		 * @returns {Object} New nested object instance.
		 */
		propDesc.newObject = function() {
			return this._factory.call(this._definition);
		};

		// return the descriptor
		return propDesc;
	}
}

// export the class
module.exports = CoreExtention;
