/**
 * Record types library module.
 *
 * @module x2node-records
 */
'use strict';

const RecordTypesLibrary = require('./lib/record-types-library.js');


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
