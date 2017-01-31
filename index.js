/**
 * Record types library module.
 *
 * @module x2node-records
 */
'use strict';

const common = require('x2node-common');


/**
 * Record types library.
 */
class RecordTypesLibrary {

	/**
	 * <b>The constructor is not accessible from the client code. Instances are
	 * created using module's
	 * [createRecordTypesLibrary]{@link module:x2node-records.createRecordTypesLibrary}
	 * function.</b>
	 *
	 * @param {Object} recordTypeDefs Record type definitions.
	 * @throws {module:x2node-common.X2UsageError} If any record type definition
	 * is invalid.
	 */
	constructor(recordTypeDefs) {

		this._finalizers = new Array();
		this._recordTypeDescs = {};
		for (let recordTypeName in recordTypeDefs)
			this._recordTypeDescs[recordTypeName] = new RecordTypeDescriptor(
				this, recordTypeName, recordTypeDefs[recordTypeName]);

		this._finalizers.forEach(finalizer => {
			finalizer.call(this);
		});
		delete this._finalizers;
	}

	/**
	 * Get descriptor for the specified record type.
	 *
	 * @param {(string|external:Symbol)} recordTypeName Record type name.
	 * @returns {module:x2node-records~RecordTypeDescriptor} Record type
	 * descriptor.
	 * @throws {module:x2node-common.X2UsageError} If no such record type in the
	 * library.
	 */
	getRecordTypeDesc(recordTypeName) {

		const recordTypeDesc = this._recordTypeDescs[recordTypeName];
		if (!recordTypeDesc)
			throw new common.X2UsageError(
				'Unknown record type ' + String(recordTypeName) + '.');

		return recordTypeDesc;
	}

	/**
	 * Tell if the library has the specified record type.
	 *
	 * @param {(string|external:Symbol)} recordTypeName Record type name.
	 * @returns {boolean} <code>true</code> if there is such type.
	 */
	hasRecordType(recordTypeName) {

		return (this._recordTypeDescs[recordTypeName] !== undefined);
	}

	/**
	 * Add record type to the library. Adding a record type via this method does
	 * not modify the original type definitions object used to create the
	 * library.
	 *
	 * @param {(string|external:Symbol)} recordTypeName Record type name. Using a
	 * <code>Symbol</code> as the type name allows other modules to extend the
	 * types library in a non-collisional way.
	 * @param {Object} recordTypeDef Record type definition.
	 * @throws {module:x2node-common.X2UsageError} If record type with the same
	 * name already exists or the definition is invalid.
	 */
	addRecordType(recordTypeName, recordTypeDef) {

		if (this.hasRecordType(recordTypeName))
			throw new common.X2UsageError(
				'Record type ' + String(recordTypeName) + ' already exists.');

		this._finalizers = new Array();
		this._recordTypeDescs[recordTypeName] = new RecordTypeDescriptor(
			this, recordTypeName, recordTypeDef);

		this._finalizers.forEach(finalizer => {
			finalizer.call(this);
		});
		delete this._finalizers;
	}
}

/**
 * Descriptor of an entity that has properties, such as record type or a nested
 * object property.
 */
class PropertiesContainer {

	/**
	 * <b>The constructor is not accessible from the client code. Container
	 * instances are created internally and are made available via other
	 * descriptor objects.</b>
	 *
	 * @param {module:x2node-records~RecordTypesLibrary} recordTypes The record
	 * types library.
	 * @param {(string|external:Symbol)} recordTypeName Name of the record type,
	 * to which the container belongs (name of the record type if the container
	 * <em>is</em> itself the record type).
	 * @param {string} nestedPath Dot-separated path to the property represented
	 * by the container, or empty string if the container is the record type
	 * descriptor.
	 * @param {Object} propertyDefs Definitions of the contained properties.
	 * @throws {module:x2node-common.X2UsageError} If any property definition is
	 * invalid.
	 */
	constructor(recordTypes, recordTypeName, nestedPath, propertyDefs) {

		this._recordTypes = recordTypes;
		this._recordTypeName = recordTypeName;
		this._nestedPath = nestedPath;

		this._propNames = new Array();
		for (let propName in propertyDefs) {
			if (propertyDefs[propName].role === 'id')
				this._idPropName = propName;
			this._propNames.push(propName);
		}

		this._propertyDescs = {};
		this._propNames.forEach(propName => {
			this._propertyDescs[propName] = new PropertyDescriptor(
				this._recordTypes, this, propName, propertyDefs[propName]);
		});
	}

	/**
	 * Get specified property descriptor.
	 *
	 * @param {string} propName Property name.
	 * @returns {module:x2node-records~PropertyDescriptor} The property
	 * descriptor.
	 * @throws {module:x2node-common.X2UsageError} If no such property in the
	 * container.
	 */
	getPropertyDesc(propName) {

		const propDesc = this._propertyDescs[propName];
		if (!propDesc)
			throw new common.X2UsageError(
				'Record type ' + String(this._recordTypeName) +
					' does not have property ' + this._nestedPath + propName +
					'.');

		return propDesc;
	}

	/**
	 * Tell if the container contains the specified property.
	 *
	 * @param {string} propName Property name.
	 * @returns {boolean} <code>true</code> if there is such property.
	 */
	hasProperty(propName) {

		return (this._propertyDescs[propName] !== undefined);
	}

	/**
	 * Name of the record type, to which the container belongs (name of the
	 * record type if the container <em>is</em> itself the record type).
	 *
	 * @type {(string|external:Symbol)}
	 * @readonly
	 */
	get recordTypeName() { return this._recordTypeName; }

	/**
	 * Dot-separated path to the property represented by the container within the
	 * record type, or empty string if the container is the record type. Path to
	 * a property of a polymoprhic nested object includes the subtype name as a
	 * path element.
	 *
	 * @type {string}
	 * @readonly
	 */
	get nestedPath() { return this._nestedPath; }

	/**
	 * Name of the id property in the container, or <code>undefined</code> if no
	 * id property.
	 *
	 * @type {string}
	 * @readonly
	 */
	get idPropertyName() { return this._idPropName; }

	/**
	 * Names of all properties in the container.
	 *
	 * @type {string[]}
	 * @readonly
	 */
	get allPropertyNames() { return this._propNames; }
}

/**
 * Record type descriptor.
 *
 * @extends module:x2node-records~PropertiesContainer
 */
class RecordTypeDescriptor extends PropertiesContainer {

	/**
	 * <b>The constructor is not accessible from the client code. Record type
	 * descriptors are created internally and are available via the record type
	 * library's
	 * [getRecordTypeDesc]{@link module:x2node-records~RecordTypesLibrary#getRecordTypeDesc}
	 * method.</b>
	 *
	 * @param {module:x2node-records~RecordTypesLibrary} recordTypes The record
	 * types library.
	 * @param {(string|external:Symbol)} recordTypeName Record type name.
	 * @param {Object} recordTypeDef Record type definition.
	 * @throws {module:x2node-common.X2UsageError} If the definition is invalid.
	 */
	constructor(recordTypes, recordTypeName, recordTypeDef) {
		super(recordTypes, recordTypeName, '', recordTypeDef.properties);

		this._definition = recordTypeDef;

		if (!this.idPropertyName)
			throw new common.X2UsageError(
				'Record type ' + String(recordTypeName) +
					' does not have an id property.');

		this._factory = (
			recordTypeDef.factory ? recordTypeDef.factory : function() {
				return new Object();
			});
	}

	/**
	 * Record type name.
	 *
	 * @type {(string|external:Symbol)}
	 * @readonly
	 */
	get name() { return this.recordTypeName; }

	/**
	 * Record type definition.
	 *
	 * @type {Object}
	 * @readonly
	 */
	get definition() { return this._definition; }

	/**
	 * Create new record of this type.
	 *
	 * @returns {Object} The new record instance.
	 */
	newRecord() {

		return this._factory.call(this._definition);
	}
}

const SCALAR_VALUE_TYPE_PATTERN =
	'(string|number|boolean|datetime)|(object)\\??|(ref)\\(\\s*\\S.*\\)';
const VALUE_TYPE_RE = new RegExp(
	'^\\s*(?:' +
		SCALAR_VALUE_TYPE_PATTERN +
		'|\\[\\s*(?:' + SCALAR_VALUE_TYPE_PATTERN + ')\\s*\\]' +
		'|\\{\\s*(?:' + SCALAR_VALUE_TYPE_PATTERN + ')\\s*\\}' +
	')\\s*$'
);
const KEY_VALUE_TYPE_RE = new RegExp(
	'^(string|number|boolean|datetime)|(ref)\\(\\s*([^|\\s]+)\\s*\\)$');

/**
 * Record property descriptor.
 */
class PropertyDescriptor {

	/**
	 * <b>The constructor is not accessible from the client code. Property
	 * descriptors are created internally and are available via the property
	 * container's
	 * [getPropertyDesc]{@link module:x2node-records~PropertiesContainer#getPropertyDesc}
	 * method.</b>
	 *
	 * @param {module:x2node-records~RecordTypesLibrary} recordTypes The record
	 * types library.
	 * @param {module:x2node-records~PropertiesContainer} container The
	 * container, to which the property belongs.
	 * @param {string} propName Property name.
	 * @param {Object} propDef Property definition.
	 * @throws {module:x2node-common.X2UsageError} If the definition is invalid.
	 */
	constructor(recordTypes, container, propName, propDef) {

		// save the basics
		this._name = propName;
		this._container = container;
		this._definition = propDef;

		// parse the value type
		let match = VALUE_TYPE_RE.exec(propDef.valueType);
		if (match === null)
			throw new common.X2UsageError(
				'Record type ' + String(container.recordTypeName) +
					' property ' + container.nestedPath + propName +
					' has invalid value type.');
		this._scalarValueType = match.find((val, ind) => ((ind > 0) && val));

		// determine whether scalar, array or map
		this._isScalar = !(/^\s*[\[\{]/.test(propDef.valueType));
		this._isArray = (!this._isScalar && (/^\s*\[/.test(propDef.valueType)));
		this._isMap = (!this._isScalar && (/^\s*\{/.test(propDef.valueType)));

		// determine if polymorph object
		this._isPolymorph = /object\?/.test(propDef.valueType);
		if (this._isPolymorph && !propDef.typePropertyName)
			throw new common.X2UsageError(
				'Record type ' + String(container.recordTypeName) +
					' property ' + container.nestedPath + propName +
					' is missing typePropertyName property.');

		// determine if id property
		this._isId = (propDef.role === 'id');
		if (this._isId && !(this._isScalar && (
			this._scalarValueType === 'number' ||
				this._scalarValueType === 'string')))
			throw new common.X2UsageError(
				'Record type ' + String(container.recordTypeName) +
					' property ' + container.nestedPath + propName +
					' is an id property and can only be a scalar string or a' +
					' number.');

		// get the map key value type or property
		if (this._isMap) {
			if (propDef.keyPropertyName) {
				if ((this._scalarValueType !== 'ref') &&
					(this._scalarValueType !== 'object'))
					throw new common.X2UsageError(
						'Record type ' + String(container.recordTypeName) +
							' map property ' + container.nestedPath + propName +
							' may not have keyPropertyName property because' +
							' the map values are neither nested objects nor' +
							' references.');
				if (propDef.keyValueType)
					throw new common.X2UsageError(
						'Record type ' + String(container.recordTypeName) +
							' map property ' + container.nestedPath + propName +
							' may not have both keyValueType and' +
							' keyPropertyName properties.');
				this._keyPropertyName = propDef.keyPropertyName;
			} else if (propDef.keyValueType) {
				const m = KEY_VALUE_TYPE_RE.exec(propDef.keyValueType);
				if (m === null)
					throw new common.X2UsageError(
						'Record type ' + String(container.recordTypeName) +
							' map property ' + container.nestedPath + propName +
							' has invalid keyValueType property.');
				if (m[1]) {
					this._keyValueType = m[1];
				} else {
					this._keyValueType = m[2];
					this._keyRefTarget = m[3];
				}
			} else {
				throw new common.X2UsageError(
					'Record type ' + String(container.recordTypeName) +
						' map property ' + container.nestedPath + propName +
						' must specify either keyValueType or' +
						' keyPropertyName property.');
			}
		}

		// process reference and object properties
		if (this._scalarValueType === 'ref') {

			// extract and validate reference target record type(s)
			match = /\((.+)\)/.exec(propDef.valueType);
			this._refTargets = match[1].trim().split(/\s*\|\s*/);
			this._refTargets.forEach(refRecordTypeName => {
				recordTypes._finalizers.push(function() {
					if (!recordTypes.hasRecordType(refRecordTypeName))
						throw new common.X2UsageError(
							'Record type ' + String(container.recordTypeName) +
								' reference property ' + container.nestedPath +
								propName + ' refers to unknown record type ' +
								refRecordTypeName + '.');
				});
			});

			// determine if polymorphic
			this._isPolymorph = (this._refTargets.length > 1);

			// process map key property if any
			if (this._isMap && this._keyPropertyName) {
				const mapPropDesc = this;
				recordTypes._finalizers.push(function() {
					mapPropDesc._refTargets.forEach(refRecordTypeName => {
						mapPropDesc._processKeyProperty(
							recordTypes.getRecordTypeDesc(refRecordTypeName));
					});
				});
			}

		} else if (this._scalarValueType === 'object') {

			// polymorphic?
			if (this._isPolymorph) {

				// for each subtype get nested properties and object factories
				this._nestedProperties = {};
				this._factories = {};
				for (let subtypeName in propDef.subtypes) {
					const subtypeDef = propDef.subtypes[subtypeName];

					// create nested properties container
					const nestedProps = this._createObjectNestedProperties(
						recordTypes, container, propName + '.' + subtypeName,
						subtypeDef);
					this._nestedProperties[subtypeName] = nestedProps;

					// process map key property if any
					if (this._isMap && this._keyPropertyName)
						this._processKeyProperty(nestedProps);

					// create object factory
					this._factories[subtypeName] =
						this._createObjectFactory(subtypeDef);
				}
			} else { // non-polymoprhic

				// create nested properties container
				this._nestedProperties = this._createObjectNestedProperties(
					recordTypes, container, propName, propDef);

				// process map key property if any
				if (this._isMap && this._keyPropertyName)
					this._processKeyProperty(this._nestedProperties);

				// create object factory
				this._factory = this._createObjectFactory(propDef);
			}
		}

		// validate target of the reference map key
		if (this._isMap && (this._keyValueType === 'ref')) {
			const keyRefTarget = this._keyRefTarget;
			recordTypes._finalizers.push(function() {
				if (!recordTypes.hasRecordType(keyRefTarget))
					throw new common.X2UsageError(
						'Record type ' + String(container.recordTypeName) +
							' map property ' + container.nestedPath + propName +
							' specifies key type as a reference that refers to' +
							' unknown record type ' + keyRefTarget + '.');
			});
		}
	}

	/**
	 * Create nested properties container for a nested object property.
	 *
	 * @private
	 * @param {module:x2node-records~RecordTypesLibrary} recordTypes The record
	 * types library.
	 * @param {module:x2node-records~PropertiesContainer} container The
	 * container, to which the nested object property belongs.
	 * @param {string} fullPropName Property name, including subtype designation
	 * for a polymorphic nested object property.
	 * @param {Object} objDef Definition containing the nested properties.
	 * @returns {module:x2node-records~PropertiesContainer} New nested properties
	 * container.
	 * @throws {module:x2node-common.X2UsageError} If the definition is invalid.
	 */
	_createObjectNestedProperties(recordTypes, container, fullPropName, objDef) {

		// create nested properties container
		const nestedProperties = new PropertiesContainer(
			recordTypes, container.recordTypeName,
			container.nestedPath + fullPropName + '.', objDef.properties);

		// validate nested object
		if (this._isArray) {

			// must have an id in the nested object
			if (nestedProperties.idPropertyName === undefined)
				throw new common.X2UsageError(
					'Record type ' + String(container.recordTypeName) +
						' property ' + container.nestedPath + fullPropName +
						' must have an id property.');

		} else if (this._isMap) {

			// validate map key property if any
			if (this._keyPropertyName) {
				if (!nestedProperties.hasProperty(this._keyPropertyName))
					throw new common.X2UsageError(
						'Record type ' + String(container.recordTypeName) +
							' nested object map property ' +
							container.nestedPath + fullPropName +
							' declares key property ' + this._keyPropertyName +
							' that does not exist among the nested object' +
							' properties.');
				const keyPropDesc = nestedProperties.getPropertyDesc(
					this._keyPropertyName);
				if (!keyPropDesc.isScalar() || keyPropDesc.isPolymorph() ||
					(keyPropDesc.scalarValueType === 'object'))
					throw new common.X2UsageError(
						'Record type ' + String(container.recordTypeName) +
							' nested object map property ' +
							container.nestedPath + fullPropName +
							' declares key property ' + this._keyPropertyName +
							' that is not scalar, is a nested object, or is' +
							' polymoprhic.');
				if (this._keyValueType) {
					if (
						(keyPropDesc.scalarValueType !== this._keyValueType) ||
							(keyPropDesc.isRef() && (
								keyPropDesc.refTarget !== this._keyRefTarget))
					) throw new common.X2UsageError(
						'Record type ' + String(container.recordTypeName) +
							' nested polymorphic object map property ' +
							container.nestedPath + fullPropName +
							' declares key property ' + this._keyPropertyName +
							' that has different value type in different' +
							' map value subtypes.');
				} else {
					this._keyValueType = keyPropDesc.scalarValueType;
					if (keyPropDesc.isRef())
						this._keyRefTarget = keyPropDesc.refTarget;
				}
			}

		} else { // scalar

			// may not have an id in the nested object
			if (nestedProperties.idPropertyName !== undefined)
				throw new common.X2UsageError(
					'Record type ' + String(container.recordTypeName) +
						' property ' + container.nestedPath + fullPropName +
						' may not have an id property.');
		}

		// return the nested container
		return nestedProperties;
	}

	/**
	 * Process key property name definition property and set key property value
	 * type and reference target, if applicable, in the descriptor.
	 *
	 * @private
	 * @param {module:x2node-records~PropertiesContainer} keyPropContainer The
	 * container that should contain the key property.
	 */
	_processKeyProperty(keyPropContainer) {

		// get the key property descriptor
		const keyPropName = this._keyPropertyName;
		if (!keyPropContainer.hasProperty(keyPropName))
			throw new common.X2UsageError(
				'Record type ' + String(this._container.recordTypeName) +
					' map property ' + this._container.nestedPath + this._name +
					' declares key property ' + keyPropName +
					' that does not exist among the target object properties.');
		const keyPropDesc = keyPropContainer.getPropertyDesc(keyPropName);

		// validate the key property value type
		if (!keyPropDesc.isScalar() || keyPropDesc.isPolymorph() ||
			(keyPropDesc.scalarValueType === 'object'))
			throw new common.X2UsageError(
				'Record type ' + String(this._container.recordTypeName) +
					' map property ' + this._container.nestedPath + this._name +
					' declares key property ' + keyPropName +
					' that is not scalar, is a nested object, or is' +
					' polymoprhic.');

		// set key value type in the map property descriptor
		if (this._keyValueType === undefined) {
			this._keyValueType = keyPropDesc.scalarValueType;
			if (keyPropDesc.isRef())
				this._keyRefTarget = keyPropDesc.refTarget;
		} else { // called multiple times for polymorph map values
			if ((keyPropDesc.scalarValueType !== this._keyValueType) ||
				(keyPropDesc.isRef() && (
					keyPropDesc.refTarget !== this._keyRefTarget)))
				throw new common.X2UsageError(
					'Record type ' + String(this._container.recordTypeName) +
						' polymorphic map property ' +
						this._container.nestedPath + this._name +
						' declares key property ' + keyPropName +
						' that has different value types in different' +
						' map value subtypes.');
		}
	}

	/**
	 * Create nested object factory.
	 *
	 * @private
	 * @param {Object} objDef Object definition.
	 * @returns {Function} The factory function.
	 */
	_createObjectFactory(objDef) {

		return (
			objDef.factory ? objDef.factory :
				function() {
					return new Object();
				}
		);
	}

	/**
	 * Property name.
	 *
	 * @type {string}
	 * @readonly
	 */
	get name() { return this._name; }

	/**
	 * Container, to which the property belongs.
	 *
	 * @type {module:x2node-records~PropertiesContainer}
	 * @readonly
	 */
	get container() { return this._container; }

	/**
	 * Property definition.
	 *
	 * @type {Object}
	 * @readonly
	 */
	get definition() { return this._definition; }

	/**
	 * Scalar value type of the property. One of "string", "number", "boolean",
	 * "datetime", "object" or "ref".
	 *
	 * @type {string}
	 * @readonly
	 */
	get scalarValueType() { return this._scalarValueType; }

	/**
	 * <code>true</code> if the property is scalar.
	 *
	 * @type {boolean}
	 * @readonly
	 */
	isScalar() { return this._isScalar; }

	/**
	 * <code>true</code> if the property is an array.
	 *
	 * @type {boolean}
	 * @readonly
	 */
	isArray() { return this._isArray; }

	/**
	 * <code>true</code> if the property is a map.
	 *
	 * @type {boolean}
	 * @readonly
	 */
	isMap() { return this._isMap; }

	/**
	 * For a map property, scalar value type of the map key.
	 *
	 * @type {string}
	 * @readonly
	 */
	get keyValueType() { return this._keyValueType; }

	/**
	 * If <code>keyValueType</code> is a reference, the reference target record
	 * type name.
	 *
	 * @type {string}
	 * @readonly
	 */
	get keyRefTarget() { return this._keyRefTarget; }

	/**
	 * For a nested object or reference map property, name of the property in the
	 * nested object or the referred record type that acts as the map key.
	 *
	 * @type {string}
	 * @readonly
	 */
	get keyPropertyName() { return this._keyPropertyName; }

	/**
	 * <code>true</code> if the property is polymorphic (either nested object or
	 * reference).
	 *
	 * @type {boolean}
	 * @readonly
	 */
	isPolymorph() { return this._isPolymorph; }

	/**
	 * <code>true</code> if the property is a record or nested object instance
	 * id.
	 *
	 * @type {boolean}
	 * @readonly
	 */
	isId() { return this._isId; }

	/**
	 * <code>true</code> if the property is a reference
	 * (<code>scalarValueType</code> is "ref").
	 *
	 * @type {boolean}
	 * @readonly
	 */
	isRef() { return (this._scalarValueType === 'ref'); }

	/**
	 * Name of the target record type for a reference property.
	 *
	 * @type {string}
	 * @readonly
	 */
	get refTarget() { return this._refTargets[0]; }

	/**
	 * For a polymorphic reference property, names of all possible target record
	 * types.
	 *
	 * @type {string[]}
	 * @readonly
	 */
	get refTargets() { return this._refTargets; }

	/**
	 * For a nested object property (<code>scalarValueType</code> is "object"),
	 * the descriptors of the nested properties (by subtype, if polymorphic).
	 *
	 * @type {(module:x2node-records~PropertiesContainer|Object.<string,module:x2node-records~PropertiesContainer>)}
	 * @readonly
	 */
	get nestedProperties() { return this._nestedProperties; }

	/**
	 * Create new nested object instance for a nested object property.
	 *
	 * @returns {Object} New nested object instance.
	 *//**
	 * Create new nested object instance for a polymorphic nested object
	 * property.
	 *
	 * @param {string} subtypeName Concrete subtype name.
	 * @returns {Object} New nested object instance of the specified subtype.
	 */
	newObject(subtypeName) {

		if (this._isPolymorph) {
			const obj = this._factories[subtypeName].call(this._definition);
			obj[this._definition.typePropertyName] = subtypeName;
			return obj;
		}

		return this._factory.call(this._definition);
	}
}

/**
 * Create record type library using the specified type definitions.
 *
 * @param {Object} recordTypeDefs Record type definitions.
 * @returns {module:x2node-records~RecordTypesLibrary} Record types library
 * object.
 * @throws {module:x2node-common.X2UsageError} If any record type definition is
 * invalid.
 */
exports.createRecordTypesLibrary = function(recordTypeDefs) {

	return new RecordTypesLibrary(recordTypeDefs);
};
