'use strict';

const common = require('x2node-common');

const PropertiesContainer = require('./properties-container.js');


/**
 * Record type descriptor.
 *
 * @memberof module:x2node-records
 * @inner
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

module.exports = RecordTypeDescriptor;
