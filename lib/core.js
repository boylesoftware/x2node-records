'use strict';

const common = require('x2node-common');


/**
 * Regular expression for parsing property value type specifications.
 *
 * @private
 * @type {RegExp}
 */
const VALUE_TYPE_RE = new RegExp(
	'^(?:(string|number|boolean|datetime|object)' +
		'|(ref)\\((\\S+)\\))(?:\\[\\]|\\{\\})?$'
);

/**
 * Get invalid property definition error.
 *
 * @private
 * @param {module:x2node-records~PropertyDescriptor} propDesc Property
 * descriptor.
 * @param {string} msg Error message.
 * @returns {module:x2node-common.X2UsageError} Error to throw.
 */
function invalidPropDef(propDesc, msg) {
	return new common.X2UsageError(
		'Property ' + propDesc.container.nestedPath + propDesc.name +
			' of record type ' + String(propDesc.container.recordTypeName) +
			' has invalid definition: ' + msg);
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
 * Subtype property marker.
 *
 * @private
 */
const SUBTYPE = Symbol('SUBTYPE');

/**
 * Extension that implements the core functionaity.
 *
 * @private
 * @memberof module:x2node-records
 * @inner
 * @implements {module:x2node-records.Extension}
 */
class CoreExtention {

	// extend properties containers
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
				return this._factory.call(this);
			};
		}

		// return the container
		return container;
	}

	// extend property descriptors
	extendPropertyDescriptor(ctx, propDesc) {

		// get the definition
		const propDef = propDesc.definition;

		// parse the value type
		let match = VALUE_TYPE_RE.exec(propDef.valueType);
		if (match === null)
			throw invalidPropDef(
				propDesc, 'unknown value type or invalid value type syntax.');
		propDesc._scalarValueType = match.find((val, ind) => ((ind > 0) && val));

		// determine whether scalar, array or map
		propDesc._isArray = propDef.valueType.endsWith('[]');
		propDesc._isMap = propDef.valueType.endsWith('{}');
		propDesc._isScalar = (!propDesc._isArray && !propDesc._isMap);

		// determine if optional
		propDesc._optional = (
			propDef.optional === undefined ?
				!propDesc._isScalar : propDef.optional);

		// determine if id property
		propDesc._isId = (propDef.role === 'id');
		if (propDesc._isId && !(propDesc._isScalar && (
			propDesc._scalarValueType === 'number' ||
				propDesc._scalarValueType === 'string')))
			throw invalidPropDef(
				propDesc, 'id property may only be a scalar string or' +
					' a number.');

		// determine if polymorph object
		propDesc._isPolymorphObject = (propDef.subtypes !== undefined);
		if (propDesc._isPolymorphObject) {
			propDesc._typePropertyName = propDef.typePropertyName;
			if (!propDesc._typePropertyName)
				throw invalidPropDef(
					propDesc, 'missing typePropertyName attribute.');
		}

		// process reference property
		if (propDesc._scalarValueType === 'ref') {

			// extract and validate reference target record type(s)
			const refTargets = match[3].split('|');

			// determine if polymorphic
			propDesc._isPolymorphRef = (refTargets.length > 1);
			if (propDesc._isPolymorphRef) {

				propDesc._scalarValueType = 'object';

				const supertypeDef = Object.create(propDef);
				supertypeDef.properties = {};
				propDesc._subtypes = new Array();
				refTargets.forEach(refTarget => {
					propDesc._subtypes.push(refTarget);
					supertypeDef.properties[refTarget] = {
						[SUBTYPE]: true,
						valueType: 'ref(' + refTarget + ')',
						optional: true
					};
				});
				propDesc._nestedProperties = ctx.createPropertiesContainer(
					propDesc, supertypeDef);

				propDesc._factory = createObjectFactory({});

			} else {

				propDesc._refTarget = refTargets[0];

				ctx.onLibraryComplete(recordTypes => {
					if (!recordTypes.hasRecordType(propDesc.refTarget))
						throw invalidPropDef(
							propDesc, 'unknown reference target record type.');
					propDesc._nestedProperties = recordTypes.getRecordTypeDesc(
						propDesc.refTarget);
				});
			}
		}

		// process nested object property
		if ((propDesc._scalarValueType === 'object') &&
			!propDesc._isPolymorphRef) {

			// get/create nested properties container
			if (propDesc._viewOfDesc) {

				propDesc._nestedProperties = viewOfDesc._nestedProperties;

			} else if (propDesc._isPolymorphObject) {

				const supertypeDef = Object.create(propDef);
				supertypeDef.properties = (
					propDef.properties ? Object.create(propDef.properties) : {}
				);
				supertypeDef.subtypes = null;
				propDesc._subtypes = new Array();
				for (let subtypeName in propDef.subtypes) {
					propDesc._subtypes.push(subtypeName);
					const subtypePropDef = Object.create(
						propDef.subtypes[subtypeName]);
					subtypePropDef[SUBTYPE] = true;
					subtypePropDef.typePropertyName = propDesc._typePropertyName;
					subtypePropDef.valueType = 'object';
					subtypePropDef.optional = true;
					if (supertypeDef.properties[subtypeName] !== undefined)
						throw invalidPropDef(
							propDesc, 'shared property may not have same name' +
								' as a subtype.');
					supertypeDef.properties[subtypeName] = subtypePropDef;
				}

				propDesc._nestedProperties = ctx.createPropertiesContainer(
					propDesc, supertypeDef);

			} else {

				if (!propDef.properties)
					throw invalidPropDef(propDesc, 'missing properties.');

				propDesc._nestedProperties = ctx.createPropertiesContainer(
					propDesc, propDef);
			}

			// create object factory
			propDesc._factory = createObjectFactory(propDef);
		}

		// create nested properties container for simple values collection
		if ((propDesc._scalarValueType !== 'object') &&
			(propDesc._scalarValueType !== 'ref')) {
			if (propDesc._isScalar)
				propDesc._nestedProperties = null;
			else
				propDesc._nestedProperties = ctx.createPropertiesContainer(
					propDesc, {
						properties: {
							'value': {
								valueType: propDesc._scalarValueType
							}
						}
					});
		}

		// process subtype property
		if (propDef[SUBTYPE]) {
			propDesc._subtype = true;
			propDesc._typePropertyName = propDef.typePropertyName;
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
		 * Tell if the property is a pseudo-property for a subtype in a
		 * polymorphic nested object or reference container.
		 *
		 * @function module:x2node-records~PropertyDescriptor#isSubtype
		 * @returns {boolean} <code>true</code> if the property is a subtype
		 * property (can be either nested object or a reference).
		 */
		propDesc.isSubtype = function() {

			return this._subtype;
		};

		/**
		 * For a polymorphic nested object property, name of the property used as
		 * the concrete type discriminator. The same is made available on the
		 * subtype pseudo-properties (those that have <code>isSubtype()</code>
		 * return <code>true</code>).
		 *
		 * @member {string} module:x2node-records~PropertyDescriptor#typePropertyName
		 * @readonly
		 */
		Object.defineProperty(propDesc, 'typePropertyName', {
			get() { return this._typePropertyName; }
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
		 * "object"), the descriptors of the nested properties. For a reference
		 * property (<code>scalarValueType</code> is "ref"), the target record
		 * type descriptor. For a non-object, non-reference property, if it is
		 * not scalar the container describes a single property named "value"
		 * with the scalar value type. If it is scalar, the
		 * <code>nestedProperties</code> value is <code>null</code>
		 *
		 * @member {?module:x2node-records~PropertiesContainer} module:x2node-records~PropertyDescriptor#nestedProperties
		 * @readonly
		 */
		Object.defineProperty(propDesc, 'nestedProperties', {
			get() { return this._nestedProperties; }
		});

		/**
		 * For a polymorphic nested object property, the list of subtype names.
		 * For a polymorphic reference property, the list of possible referred
		 * record type names.
		 *
		 * @member {string[]} module:x2node-records~PropertyDescriptor#subtypes
		 * @readonly
		 */
		Object.defineProperty(propDesc, 'subtypes', {
			get() { return this._subtypes; }
		});

		/**
		 * Create new nested object instance for a nested object property.
		 *
		 * @function module:x2node-records~PropertyDescriptor#newObject
		 * @returns {Object} New nested object instance.
		 */
		propDesc.newObject = function() {
			return this._factory.call(this);
		};

		// return the descriptor
		return propDesc;
	}
}

// export the class
module.exports = CoreExtention;
