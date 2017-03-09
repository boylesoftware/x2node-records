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
	 * created by using factory's
	 * [buildLibrary]{@link module:x2node-records~RecordTypesLibraryFactory#buildLibrary}
	 * method.</b>
	 *
	 * @param {Object} recordTypeDefs Record type definitions.
	 */
	constructor(recordTypeDefs) {

		this._definition = recordTypeDefs;

		this._recordTypeDescs = {};
	}

	/**
	 * Add record types from the definition to the library.
	 *
	 * @private
	 * @param {module:x2node-records~LibraryConstructionContext} ctx Library
	 * construction context.
	 * @return {module:x2node-records~RecordTypesLibrary} This library.
	 */
	addRecordTypes(ctx) {

		for (let recordTypeName in this._definition)
			this.addRecordType(
				ctx, recordTypeName, this._definition[recordTypeName]);

		return this;
	}

	/**
	 * Add record type to the library.
	 *
	 * @private
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
				'Unknown record type ' + String(recordTypeName) + '.');

		return recordTypeDesc;
	}

	/**
	 * Tell if the library has the specified record type.
	 *
	 * @param {(string|Symbol)} recordTypeName Record type name.
	 * @returns {boolean} <code>true</code> if there is such type.
	 */
	hasRecordType(recordTypeName) {

		return (this._recordTypeDescs[recordTypeName] !== undefined);
	}

	/**
	 * The original library definition provided to the factory.
	 *
	 * @type {Object}
	 * @readonly
	 */
	get definition() { return this._definition; }
}

// export the class
module.exports = RecordTypesLibrary;
