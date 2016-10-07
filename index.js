/**
 * Record types library module.
 *
 * @module x2node-records
 */
'use strict';

/**
 * Invalid record type definition.
 *
 * @extends Error
 */
class RecordTypeError extends Error {

	constructor(message) {
		super();

		Error.captureStackTrace(this, this.constructor);

		this.name = 'RecordTypeError';
		this.message = message;
	}
}

class RecordTypesLibrary {

	constructor(recordTypeDefs) {

		this._recordTypeDefs = recordTypeDefs;

		this._recordTypeDescs = {};
	}

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

	hasRecordType(recordTypeName) {

		return (this._recordTypeDefs[recordTypeName] !== undefined);
	}
}

class PropertiesContainer {

	constructor(recordTypes, recordTypeName, nestedPath, propertyDefs) {

		this._recordTypes = recordTypes;
		this._recordTypeName = recordTypeName;
		this._nestedPath = nestedPath;
		this._propertyDefs = propertyDefs;

		this._idPropName = Object.keys(propertyDefs).find(
			propName => (propertyDefs[propName].role === 'id'));

		this._propertyDescs = {};
	}

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

	hasProperty(propName) {

		return (this._propertyDefs[propName] !== undefined);
	}

	get recordTypeName() { return this._recordTypeName; }

	get nestedPath() { return this._nestedPath; }

	get idPropertyName() { return this._idPropName; }
}

class RecordTypeDescriptor extends PropertiesContainer {

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

	get name() { return this.recordTypeName; }

	get definition() { return this._definition; }

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

class PropertyDescriptor {

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

	get name() { return this._name; }

	get definition() { return this._definition; }

	get scalarValueType() { return this._scalarValueType; }

	isScalar() { return this._isScalar; }

	isArray() { return this._isArray; }

	isMap() { return this._isMap; }

	isPolymorph() { return this._isPolymorph; }

	isId() { return this._isId; }

	isRef() { return (this._scalarValueType === 'ref'); }

	get refTarget() { return this._refTargets[0]; }

	get refTargets() { return this._refTargets; }

	get nestedProperties() { return this._nestedProperties; }

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
