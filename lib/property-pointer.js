'use strict';

const common = require('x2node-common');


/**
 * Property pointer, which is an implementation of
 * [RFC 6901]{@link https://tools.ietf.org/html/rfc6901} JSON Pointer.
 *
 * @memberof module:x2node-records
 * @inner
 */
class PropertyPointer {

	/**
	 * <strong>Note:</strong> The constructor is not accessible from the client
	 * code. Prointer instances are created using module's
	 * [parseJSONPointer()]{@link module:x2node-records.parseJSONPointer}
	 * function.
	 *
	 * @private
	 * @param {?module:x2node-records~PropertyPointer} parent Parent pointer, or
	 * <code>null</code> for the root pointer.
	 * @param {?string} pointerToken Pointer token (without leading slash), or
	 * <code>null</code> for the root pointer.
	 * @param {?module:x2node-records~PropertyDescriptor} propDesc Descriptor of
	 * the property, at which the pointer points, or <code>null</code> for the
	 * root pointer.
	 * @param {string} propPath Path to the property, at which the pointer
	 * points, or empty string for the root pointer.
	 * @param {boolean} collectionElement <code>true</code> if the pointer is for
	 * an array or map element.
	 * @param {?module:x2node-records~PropertiesContainer} childrenContainer
	 * Child properties container, if applicable.
	 */
	constructor(
		parent, pointerToken, propDesc, propPath, collectionElement,
		childrenContainer) {

		this._parent = parent;
		this._pointerToken = pointerToken;
		this._propDesc = propDesc;
		this._propPath = propPath;
		this._collectionElement = collectionElement;
		this._childrenContainer = childrenContainer;

		this._pointerChain = new Array();
		for (let p = this; p !== null; p = p._parent)
			this._pointerChain.push(p);
	}

	/**
	 * Create child pointer.
	 *
	 * @private
	 * @param {string} pointerToken Child pointer token.
	 * @param {string} fullPointer Full pointer for error reporting.
	 * @param {boolean} noDash <code>true</code> to disallow dash pointer.
	 * @returns {module:x2node-records~PropertyPointer} Child property pointer.
	 * @throws {module:x2node-common.X2UsageError} If the resulting pointer would
	 * be invalid.
	 */
	_createChildPointer(pointerToken, fullPointer, noDash) {

		// check if root
		const root = this.isRoot();

		// check if beyond dash
		if (!root && this._collectionElement && this._propDesc.isArray() &&
			(this._pointerToken === '-'))
			throw new common.X2UsageError(
				'Invalid property pointer "' + fullPointer +
					'": unexpected dash for an array index.');

		// check if array element
		if (!root && !this._collectionElement && this._propDesc.isArray()) {
			const dash = (pointerToken === '-');
			if (dash && noDash)
				throw new common.X2UsageError(
					'Invalid property pointer "' + fullPointer +
						'": dash not allowed for an array index in this' +
						' pointer.');
			if (!dash && !/^(?:0|[1-9][0-9]*)$/.test(pointerToken))
				throw new common.X2UsageError(
					'Invalid property pointer "' + fullPointer +
						'": invalid array index.');
			return new PropertyPointer(
				this, (dash ? pointerToken : Number(pointerToken)),
				this._propDesc, this._propPath, true, this._childrenContainer);
		}

		// check if map element
		if (!root && !this._collectionElement && this._propDesc.isMap())
			return new PropertyPointer(
				this, pointerToken, this._propDesc, this._propPath, true,
				this._childrenContainer);

		// object property:

		if (!root && (this._propDesc.scalarValueType !== 'object'))
			throw new common.X2UsageError(
				'Invalid property pointer "' + fullPointer +
					'": ' + this._propDesc.container.nestedPath +
					this._propDesc.name + ' does not have nested elements.');
		if (!this._childrenContainer.hasProperty(pointerToken))
			throw new common.X2UsageError(
				'Invalid property pointer "' + fullPointer +
					'": no such property.');
		const childPropDesc = this._childrenContainer.getPropertyDesc(
			pointerToken);

		return new PropertyPointer(
			this, pointerToken, childPropDesc,
			this._childrenContainer.nestedPath + pointerToken, false,
			childPropDesc.nestedProperties);
	}

	/**
	 * Get value of the property, at which the pointer points.
	 *
	 * @param {Object} record The record, from which to get the value. Must match
	 * the pointer's record type.
	 * @returns {*} The property value, or <code>null</code> if no value. For
	 * absent array and map elements returns <code>undefined</code>.
	 * @throws {module:x2node-common.X2DataError} If the property cannot be
	 * reached.
	 */
	getValue(record) {

		return this._pointerChain.reduceRight(
			(obj, p, i) => p._getImmediateValue(obj, i, false), record);
	}

	/**
	 * Add value to the property, at which the pointer points. If the pointer
	 * points at an array element, the value is inserted into the array at the
	 * specified by the pointer location. In all other cases, any existing value
	 * is simply replaced.
	 *
	 * <p>Note, that the method is not allowed on the root pointer.
	 *
	 * @param {Object} record The record.
	 * @param {*} value The value to add. May not be <code>undefined</code> (use
	 * [deleteValue()]{@link module:x2node-records~PropertyPointer#deleteValue}
	 * method to delete optional property values). A <code>null</code> is not
	 * allowed for nested object array and map elements. <strong>The method does
	 * not validate the value in any other way beyond that.</strong>
	 * @throws {module:x2node-common.X2UsageError} If called on a root pointer,
	 * or inappropriate value is provided.
	 * @throws {module:x2node-common.X2DataError} If the property cannot be
	 * reached.
	 */
	addValue(record, value) {

		this._setValue(record, value, true);
	}

	/**
	 * Replace value of the property, at which the pointer points.
	 *
	 * <p>Note, that the method is not allowed on the root pointer. Also, not
	 * allowed for a dash array element pointer.
	 *
	 * @param {Object} record The record.
	 * @param {*} value The value to set. May not be <code>undefined</code> (use
	 * [deleteValue()]{@link module:x2node-records~PropertyPointer#deleteValue}
	 * method to delete optional property values). A <code>null</code> is not
	 * allowed for nested object array and map elements. <strong>The method does
	 * not validate the value in any other way beyond that.</strong>
	 * @throws {module:x2node-common.X2UsageError} If called on a root pointer,
	 * a dash array index pointer, or inappropriate value is provided.
	 * @throws {module:x2node-common.X2DataError} If the property cannot be
	 * reached.
	 */
	replaceValue(record, value) {

		this._setValue(record, value, false);
	}

	/**
	 * Set value of the property, at which the pointer points.
	 *
	 * @private
	 * @param {Object} record The record.
	 * @param {*} value The value to set.
	 * @param {boolean} insert <code>true</code> to add value, <code>false</code>
	 * to replace.
	 * @throws {module:x2node-common.X2UsageError} If called on a root pointer,
	 * a dash array index pointer and <code>insert</code> is <code>false</code>,
	 * or inappropriate value is provided.
	 * @throws {module:x2node-common.X2DataError} If the property cannot be
	 * reached.
	 */
	_setValue(record, value, insert) {

		if (this.isRoot())
			throw new common.X2UsageError('May not replace the whole record.');

		if (value === undefined)
			throw new common.X2UsageError('May not use undefined as a value.');

		if ((value === null) && this._collectionElement &&
			(this._propDesc.scalarValueType === 'object'))
			throw new common.X2UsageError('May not use null as a value.');

		this._pointerChain.reduceRight((obj, p, i) => {
			const c = p._getImmediateValue(obj, i, true);
			if (i === 0) {
				if (p._collectionElement && p._propDesc.isArray()) {
					if (p._pointerToken === '-') {
						if (!insert)
							throw new common.X2UsageError(
								'May not replace dash index.');
						obj.push(value);
					} else if (p._pointerToken < obj.length) {
						if (insert)
							obj.splice(p._pointerToken, 0, value);
						else
							obj[p._pointerToken] = value;
					} else {
						throw new common.X2DataError(
							'Array index is out of bounds.');
					}
				} else {
					obj[p._pointerToken] = value;
				}
			}
			return c;
		}, record);
	}

	/**
	 * Erase the property, at which the pointer points. If the pointer points at
	 * an array element, the element is deleted from the array.
	 *
	 * <p>Note, that the method is not allowed on the root pointer. Also, not
	 * allowed for a dash array element pointer.
	 *
	 * @param {Object} record The record.
	 * @throws {module:x2node-common.X2UsageError} If called on a root pointer,
	 * or a dash array index pointer.
	 * @throws {module:x2node-common.X2DataError} If the property cannot be
	 * reached.
	 */
	deleteValue(record) {

		if (this.isRoot())
			throw new common.X2UsageError('May not delete the whole record.');

		this._pointerChain.reduceRight((obj, p, i) => {
			const c = p._getImmediateValue(obj, i, false);
			if (i === 0) {
				if (p._collectionElement && p._propDesc.isArray()) {
					if (p._pointerToken === '-') {
						throw new common.X2UsageError(
							'May not delete dash index.');
					} else if (obj && (p._pointerToken < obj.length)) {
						obj.splice(p._pointerToken, 1);
					} else {
						throw new common.X2DataError(
							'Array index is out of bounds.');
					}
				} else if (obj) {
					delete obj[p._pointerToken];
				}
			}
			return c;
		}, record);
	}

	/**
	 * Get value of the property, at which the pointer points provided with the
	 * value of the parent property.
	 *
	 * @private
	 * @param {(Object|Array)} obj The parent object that is supposed to have the
	 * value.
	 * @param {number} i Index of the token in the pointer chain. Zero is for the
	 * last token.
	 * @param {boolean} forSet <code>true</code> if intended to set value at the
	 * pointer location (missing leaf arrays and maps are automatically created).
	 * @returns {*} The value.
	 * @throws {module:x2node-common.X2DataError} If the property cannot be
	 * reached.
	 */
	_getImmediateValue(obj, i, forSet) {

		const noValue = () => new common.X2DataError(
			'No property value at ' + this._propPath + '.');

		// return the record itself if root
		if (this.isRoot())
			return obj;

		// check if array index, map key or object property
		let val;
		if (this._propDesc.isArray() && !this._collectionElement) {
			if (this._pointerToken !== '-') {
				if (this._pointerToken >= obj.length)
					throw noValue();
				val = obj[this._pointerToken];
				if (((val === undefined) || (val === null)) && (i > 0))
					throw noValue();
			}
		} else if (this._propDesc.isMap() && !this._collectionElement) {
			val = obj[this._pointerToken];
			if (((val === undefined) || (val === null)) && (i > 0))
				throw noValue();
		} else {
			val = obj[this._pointerToken];
			if (val === undefined)
				val = null;
			if ((val === null) && (i > 0)) {
				if (i > 1)
					throw noValue();
				if (this._propDesc.isArray()) {
					val = new Array();
					if (forSet)
						obj[this._pointerToken] = val;
				} else if (this._propDesc.isMap()) {
					val = new Object();
					if (forSet)
						obj[this._pointerToken] = val;
				} else {
					throw noValue();
				}
			}
		}

		// return the value
		return val;
	}

	/**
	 * Tell if the pointer is the root pointer.
	 *
	 * @returns {boolean} <code>true</code> If root pointer.
	 */
	isRoot() { return (this._parent === null); }

	/**
	 * Descriptor of the property, at which the pointer points, or
	 * <code>null</code> if root pointer.
	 *
	 * @member {?module:x2node-records~PropertyDescriptor}
	 * @readonly
	 */
	get propDesc() { return this._propDesc; }

	/**
	 * Path of the property, at which the pointer points, or empty string if root
	 * pointer.
	 *
	 * @member {string}
	 * @readonly
	 */
	get propPath() { return this._propPath; }

	/**
	 * <code>true</code> if the pointer is for an array or map element.
	 *
	 * @member {boolean}
	 * @readonly
	 */
	get collectionElement() { return this._collectionElement; }
}


/**
 * Parse the specified JSON pointer.
 *
 * @function module:x2node-records.parseJSONPointer
 * @param {module:x2node-records~RecordTypeDescriptor} recordTypeDesc Record type
 * descriptor.
 * @param {string} propPointer Property pointer string in RFC 6901 format.
 * @param {boolean} [noDash] <code>true</code> if a dash at the end of the
 * pointer to an array element is not allowed.
 * @returns {module:x2node-records~PropertyPointer} Parsed property pointer.
 * @throws {module:x2node-common.X2UsageError} If the pointer is invalid.
 */
function parse(recordTypeDesc, propPointer, noDash) {

	// basic validation of the pointer
	if (((typeof propPointer) !== 'string') ||
		((propPointer.length > 0) && !propPointer.startsWith('/')))
		throw new common.X2UsageError(
			'Invalid property pointer "' + String(propPointer) +
				'" type or syntax.');

	// parse the pointer
	const propPointerTokens = propPointer.split('/');
	let lastPointer = new PropertyPointer(
		null, null, null, '', false, recordTypeDesc);
	for (let i = 1, len = propPointerTokens.length; i < len; i++) {
		lastPointer = lastPointer._createChildPointer(
			propPointerTokens[i].replace(
					/~[01]/g, m => (m === '~0' ? '~' : '/')),
			propPointer, noDash);
	}

	// return the pointer chain
	return lastPointer;
}

// export the parser function
exports.parse = parse;
