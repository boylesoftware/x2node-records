'use strict';

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
	 * <strong>Note:</strong> The constructor is not accessible from the client
	 * code. Record type descriptors are created internally and are available via
	 * the record type library's
	 * [getRecordTypeDesc()]{@link module:x2node-records~RecordTypesLibrary#getRecordTypeDesc}
	 * method.
	 *
	 * @protected
	 * @param {(string|Symbol)} recordTypeName Record type name.
	 * @param {Object} recordTypeDef Record type definition.
	 */
	constructor(recordTypeName, recordTypeDef) {
		super(recordTypeName, '', recordTypeDef, null);
	}

	/**
	 * Record type name (same as <code>recordTypeName</code> property inherited
	 * from the properties container).
	 *
	 * @member {(string|Symbol)}
	 * @readonly
	 */
	get name() { return this.recordTypeName; }
}

// export the class
module.exports = RecordTypeDescriptor;
