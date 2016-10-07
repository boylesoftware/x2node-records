/**
 * Record types library module. The module exports the
 * [RecordTypesLibrary]{@link module:x2node-records~RecordTypesLibrary} class.
 *
 * @example
 * const RecordTypesLibrary = require('x2node-records');
 *
 * const recordTypes = new RecordTypesLibrary(...);
 *
 * @module x2node-records
 */
'use strict';

/**
 * Node.js <code>Error</code> object.
 *
 * @external Error
 * @see {@link https://nodejs.org/dist/latest-v4.x/docs/api/errors.html#errors_class_error}
 */

/**
 * Invalid record type definition.
 *
 * @extends external:Error
 */
class RecordTypeError extends Error {

	/**
	 * <b>The constructor is not accessible from the client code.</b>
	 *
	 * @param {string} message The error description.
	 */
	constructor(message) {
		super();

		Error.captureStackTrace(this, this.constructor);

		this.name = 'RecordTypeError';
		this.message = message;
	}
}

/**
 * Record types library.
 */
class RecordTypesLibrary {

	/**
	 * Create record types library.
	 *
	 * @param {Object} recordTypeDefs Record type definitions.
	 */
	constructor(recordTypeDefs) {

		this._recordTypeDefs = recordTypeDefs;

		this._recordTypeDescs = {};
	}

	/**
	 * Get descriptor for the specified record type.
	 *
	 * @param {string} recordTypeName Record type name.
	 * @returns {module:x2node-records~RecordTypeDescriptor} Record type
	 * descriptor.
	 * @throws {module:x2node-records~RecordTypeError} If no such record type in
	 * the library.
	 */
	getRecordTypeDesc(recordTypeName) {

		const recordTypeDesc = this._recordTypeDescs[recordTypeName];
		if (recordTypeDesc)
			return recordTypeDesc;

		const recordTypeDef = this._recordTypeDefs[recordTypeName];
		if (!recordTypeDef)
			throw new RecordTypeError(
				'Unknown record type ' + recordTypeName + '.');

		return (this._recordTypeDescs[recordTypeName] = new RecordTypeDescriptor(
			this, recordTypeName, recordTypeDef));
	}

	/**
	 * Tell if the library has the specified record type.
	 *
	 * @param {string} recordTypeName Record type name.
	 * @returns {boolean} <code>true</code> if there is such type.
	 */
	hasRecordType(recordTypeName) {

		return (this._recordTypeDefs[recordTypeName] !== undefined);
	}
}

/**
 * Descriptor of an entity that has properties, such as record type or a nested
 * object property.
 */
class PropertiesContainer {

	/**
	 * <b>The constructor is not accessible from the client code.</b>
	 *
	 * @param {module:x2node-records~RecordTypesLibrary} recordTypes The record
	 * types library.
	 * @param {string} recordTypeName Name of the record type, to which the
	 * container belongs (name of the record type if the container <em>is</em>
	 * itself the record type).
	 * @param {string} nestedPath Dot-separated path to the property represented
	 * by the container, or empty string if the container is the record type
	 * descriptor.
	 * @param {Object} propertyDefs Definitions of the contained properties.
	 */
	constructor(recordTypes, recordTypeName, nestedPath, propertyDefs) {

		this._recordTypes = recordTypes;
		this._recordTypeName = recordTypeName;
		this._nestedPath = nestedPath;
		this._propertyDefs = propertyDefs;

		this._idPropName = Object.keys(propertyDefs).find(
			propName => (propertyDefs[propName].role === 'id'));

		this._propertyDescs = {};
	}

	/**
	 * Get specified property descriptor.
	 *
	 * @param {string} propName Property name.
	 * @returns {module:x2node-records~PropertyDescriptor} The property
	 * descriptor.
	 * @throws {module:x2node-records~RecordTypeError} If no such property in the
	 * container.
	 */
	getPropertyDesc(propName) {

		const propDesc = this._propertyDescs[propName];
		if (propDesc)
			return propDesc;

		const propDef = this._propertyDefs[propName];
		if (!propDef)
			throw new RecordTypeError(
				'Record type ' + this._recordTypeName +
					' does not have property ' + this._nestedPath + propName +
					'.');

		return (this._propertyDescs[propName] = new PropertyDescriptor(
			this._recordTypes, this, propName, propDef));
	}

	/**
	 * Tell if the container contains the specified property.
	 *
	 * @param {string} propName Property name.
	 * @returns {boolean} <code>true</code> if there is such property.
	 */
	hasProperty(propName) {

		return (this._propertyDefs[propName] !== undefined);
	}

	/**
	 * Name of the record type, to which the container belongs (name of the
	 * record type if the container <em>is</em> itself the record type).
	 *
	 * @type {string}
	 * @readonly
	 */
	get recordTypeName() { return this._recordTypeName; }

	/**
	 * Dot-separated path to the property represented by the container within the
	 * record type, or empty string if the container is the record type.
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
}

/**
 * Record type descriptor.
 *
 * @extends module:x2node-records~PropertiesContainer
 */
class RecordTypeDescriptor extends PropertiesContainer {

	/**
	 * <b>The constructor is not accessible from the client code.</b>
	 *
	 * @param {module:x2node-records~RecordTypesLibrary} recordTypes The record
	 * types library.
	 * @param {string} recordTypeName Record type name.
	 * @param {Object} recordTypeDef Record type definition.
	 */
	constructor(recordTypes, recordTypeName, recordTypeDef) {
		super(recordTypes, recordTypeName, '', recordTypeDef.properties);

		this._definition = recordTypeDef;

		if (!this.idPropertyName)
			throw new RecordTypeError(
				'Record type ' + recordTypeName +
					' does not have an id property.');

		this._factory = (
			recordTypeDef.factory ? recordTypeDef.factory : function() {
				return new Object();
			});
	}

	/**
	 * Record type name.
	 *
	 * @type {string}
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

/**
 * Record property descriptor.
 */
class PropertyDescriptor {

	/**
	 * <b>The constructor is not accessible from the client code.</b>
	 *
	 * @param {module:x2node-records~RecordTypesLibrary} recordTypes The record
	 * types library.
	 * @param {module:x2node-records~PropertiesContainer} container The
	 * container, to which the property belongs.
	 * @param {string} propName Property name.
	 * @param {Object} propDef Property definition.
	 */
	constructor(recordTypes, container, propName, propDef) {

		this._name = propName;
		this._definition = propDef;

		let match = VALUE_TYPE_RE.exec(propDef.valueType);
		if (match === null)
			throw new RecordTypeError(
				'Record type ' + container.recordTypeName +
					' property ' + container.nestedPath + propName +
					' has invalid value type.');
		this._scalarValueType = match.find((val, ind) => ((ind > 0) && val));

		this._isScalar = !(/^\s*[\[\{]/.test(propDef.valueType));
		this._isArray = (!this._isScalar && (/^\s*\[/.test(propDef.valueType)));
		this._isMap = (!this._isScalar && (/^\s*\{/.test(propDef.valueType)));

		this._isPolymorph = /object\?/.test(propDef.valueType);
		if (this._isPolymorph && !propDesc.typePropertyName)
			throw new RecordTypeError(
				'Record type ' + container.recordTypeName +
					' property ' + container.nestedPath + propName +
					' is missing typePropertyName property.');

		this._isId = (propDef.role === 'id');
		if (this._isId && !(this._isScalar && (
			this._scalarValueType === 'number' ||
				this._scalarValueType === 'string')))
			throw new RecordTypeError(
				'Record type ' + container.recordTypeName + ' property ' +
					container.nestedPath + propName + ' is an id property and' +
					' can only be a scalar string or a number.');

		if (this._scalarValueType === 'ref') {
			match = /\((.+)\)/.exec(propDef.valueType);
			this._refTargets = match[1]
				.trim()
				.split(/\s*\|\s*/)
				.map(refRecordTypeName => {
					if (!recordTypes.hasRecordType(refRecordTypeName))
						throw new RecordTypeError(
							'Record type ' + container.recordTypeName +
								' reference property ' + container.nestedPath +
								propName + ' refers to unknown record type ' +
								refRecordTypeName + '.');
					return refRecordTypeName;
				});
			this._isPolymorph = (this._refTargets.length > 1);

		} else if (this._scalarValueType === 'object') {
			if (this._isPolymorph) {
				this._nestedProperties = {};
				this._factories = {};
				Object.keys(propDef.subtypes).forEach(
					subtypeName => {
						const subtypeDef = propDef.subtypes[subtypeName];
						const nestedProps = new PropertiesContainer(
							recordTypes, container.recordTypeName,
							container.nestedPath + propName +
								'<' + subtypeName + '>.',
							subtypeDef.properties);
						this._nestedProperties[subtypeName] = nestedProps;
						if (this._isArray && (
							nestedProps.idPropertyName === undefined))
							throw new RecordTypeError(
								'Record type ' + container.recordTypeName +
									' property ' + container.nestedPath +
									propName + '<' + subtypeName +
									'> must have an id property.');
						this._factories[subtypeName] = (
							subtypeDef.factory ? subtypeDef.factory :
								function() {
									return new Object();
								});
					}
				);
			} else {
				this._nestedProperties = new PropertiesContainer(
					recordTypes, container.recordTypeName,
					container.nestedPath + propName + '.', propDef.properties);
				if (this._isArray && (
					this._nestedProperties.idPropertyName === undefined))
					throw new RecordTypeError(
						'Record type ' + container.recordTypeName +
							' property ' + container.nestedPath + propName +
							' must have an id property.');
				this._factory = (
					propDef.factory ? propDef.factory : function() {
						return new Object();
					});
			}
		}
	}

	/**
	 * Property name.
	 *
	 * @type {string}
	 * @readonly
	 */
	get name() { return this._name; }

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
	 * the descriptors of the nested properties.
	 *
	 * @type {module:x2node-records~PropertiesContainer}
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

module.exports = RecordTypesLibrary;
