/**
 * Record types library module.
 *
 * @module x2node-records
 * @requires module:x2node-common
 */
'use strict';

const RecordTypesLibraryFactory = require(
	'./lib/record-types-library-factory.js');


/**
 * Build record types library using the provided definitions. This is a shortcut
 * function that allows creating record types libraries that do not use any
 * extensions.
 *
 * @param {Object} libraryDef Library definition object.
 * @returns {module:x2node-records~RecordTypesLibrary} Record types library.
 * @throws {module:x2node-common.X2UsageError} If any record type definitions
 * are found invalid.
 */
exports.buildLibrary = function(libraryDef) {

	return (new RecordTypesLibraryFactory()).buildLibrary(libraryDef);
};

/**
 * Create record types library builder with the specified extensions.
 *
 * @param {...module:x2node-records.Extension} [extensions] Extensions.
 * @returns {module:x2node-records~RecordTypesLibraryFactory} Record types
 * library builder.
 */
exports.with = function() {

	const factory = new RecordTypesLibraryFactory();

	for (let i = 0, len = arguments.length; i < len; i++) {
		const ext = arguments[i];
		if (ext.requiredExtensions) {
			for (let depExt of ext.requiredExtensions)
				factory.addExtension(depExt);
		}
		factory.addExtension(ext);
	}

	return factory;
};
