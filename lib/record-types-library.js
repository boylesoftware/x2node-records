'use strict';

const common = require('x2node-common');

const RecordTypeDescriptor = require('./record-type-descriptor.js');


/**
 * Record types library.
 *
 * @memberof module:x2node-records
 * @inner
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

module.exports = RecordTypesLibrary;
