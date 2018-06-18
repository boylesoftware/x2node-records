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
	 * <strong>Note:</strong> The constructor is not accessible from the client
	 * code. Instances are created by using factory's
	 * [buildLibrary()]{@link module:x2node-records~RecordTypesLibraryFactory#buildLibrary}
	 * method.
	 *
	 * @protected
	 * @param {Object} libraryDef Library definition.
	 */
	constructor(libraryDef) {

		this._definition = libraryDef;

		this._definedRecordTypeNames = [];

		this._recordTypeDescs = {};
	}

	/**
	 * Add record types from the definition to the library.
	 *
	 * @protected
	 * @param {module:x2node-records~LibraryConstructionContext} ctx Library
	 * construction context.
	 * @return {module:x2node-records~RecordTypesLibrary} This library.
	 */
	addRecordTypes(ctx) {

		const recordTypeDefs = (
			this._definition.recordTypes || this._definition);
		for (let recordTypeName in recordTypeDefs) {
			this.addRecordType(
				ctx, recordTypeName, recordTypeDefs[recordTypeName]);
			this._definedRecordTypeNames.push(recordTypeName);
		}

		return this;
	}

	/**
	 * Add record type to the library.
	 *
	 * @protected
	 * @param {module:x2node-records~LibraryConstructionContext} ctx Library
	 * construction context.
	 * @param {(string|Symbol)} recordTypeName Record type name.
	 * @param {Object} recordTypeDef Record type definition.
	 */
	addRecordType(ctx, recordTypeName, recordTypeDef) {

		this._recordTypeDescs[recordTypeName] =
			ctx.completeContainer(
				ctx.extendContainer(
					new RecordTypeDescriptor(recordTypeName, recordTypeDef)
				).addProperties(ctx)
			);
	}


	/**
	 * Get descriptor for the specified record type.
	 *
	 * @param {(string|Symbol)} recordTypeName Record type name.
	 * @returns {module:x2node-records~RecordTypeDescriptor} Record type
	 * descriptor.
	 * @throws {module:x2node-common.X2UsageError} If no such record type in the
	 * library.
	 */
	getRecordTypeDesc(recordTypeName) {

		const recordTypeDesc = this._recordTypeDescs[recordTypeName];
		if (!recordTypeDesc)
			throw new common.X2UsageError(
				`Unknown record type ${String(recordTypeName)}.`);

		return recordTypeDesc;
	}

	/**
	 * Tell if the library has the specified record type.
	 *
	 * @param {(string|Symbol)} recordTypeName Record type name.
	 * @returns {boolean} <code>true</code> if there is such type.
	 */
	hasRecordType(recordTypeName) {

		return this._recordTypeDescs.hasOwnProperty(recordTypeName);
	}

	/**
	 * The original library definition provided to the factory.
	 *
	 * @member {Object}
	 * @readonly
	 */
	get definition() { return this._definition; }

	/**
	 * Names of all record types from the original library definition provided to
	 * the factory. The callers should not modify the array!
	 *
	 * @member {Array.<string>}
	 * @readonly
	 */
	get definedRecordTypeNames() { return this._definedRecordTypeNames; }

	/**
	 * Convert reference to a record of the specified record type to the
	 * record id.
	 *
	 * @param {string} recordTypeName Record type name.
	 * @param {string} ref Record reference.
	 * @returns {(string|number)} Record id.
	 * @throws {module:x2node-common.X2UsageError} If no such record type in the
	 * library.
	 */
	refToId(recordTypeName, ref) {

		const recordTypeDesc = this._recordTypeDescs[recordTypeName];
		if (!recordTypeDesc)
			throw new common.X2UsageError(
				`Unknown record type ${String(recordTypeName)}.`);

		return recordTypeDesc.refToId(ref);
	}
}

// export the class
module.exports = RecordTypesLibrary;
