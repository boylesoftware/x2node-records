'use strict';

const common = require('x2node-common');

const RecordTypesLibrary = require('./record-types-library.js');
const PropertiesContainer = require('./properties-container.js');
const CoreExtension = require('./core.js');


/**
 * Interface for record type library extensions.
 *
 * @interface Extension
 * @memberof module:x2node-records
 */
/**
 * Extend record types library. The function is called on the extension right
 * after the record types library instance is created and passed through the
 * previously added extensions. This happens before the record types are added to
 * the library. To perform work on the library after the record types are added,
 * the extension can use
 * [onLibraryComplete]{@link module:x2node-records~RecordTypesLibraryFactoryContext#onLibraryComplete}
 * method on the context.
 *
 * @function module:x2node-records.Extension#extendRecordTypesLibrary
 * @param {module:x2node-records~RecordTypesLibraryFactoryContext} ctx Library
 * building context.
 * @param {module:x2node-records~RecordTypesLibrary} recordTypes Record types
 * library instance.
 * @returns {module:x2node-records~RecordTypesLibrary} Extended record types
 * library instance.
 */
/**
 * Extend record type descriptor. The function is called on the extension right
 * after the record type descriptor instance is created and passed through the
 * previously added extensions. This happens before the properties are added to
 * the descriptor. To perform work on the descriptor after the properties are
 * added, the extension can use
 * [onContainerComplete]{@link module:x2node-records~RecordTypesLibraryFactoryContext#onContainerComplete}
 * method on the context.
 *
 * @function module:x2node-records.Extension#extendPropertiesContainer
 * @param {module:x2node-records~RecordTypesLibraryFactoryContext} ctx Library
 * building context.
 * @param {module:x2node-records~PropertiesContainer} container Properties
 * container.
 * @returns {module:x2node-records~PropertiesContainer} Extended properties
 * container.
 */
/**
 * Extend property descriptor. The function receives the property descriptor
 * after it is passed through the previously added extensions.
 *
 * @function module:x2node-records.Extension#extendPropertyDescriptor
 * @param {module:x2node-records~RecordTypesLibraryFactoryContext} ctx Library
 * building context.
 * @param {module:x2node-records~PropertyDescriptor} propDesc Property
 * descriptor.
 * @returns {module:x2node-records~PropertyDescriptor} Extended property
 * descriptor.
 */


/**
 * Context used during the building of a record types library by the factory. The
 * context is used by the library extensions to perform work on completion of
 * various descriptors.
 *
 * @memberof module:x2node-records
 * @inner
 */
class RecordTypesLibraryFactoryContext {

	/**
	 * <b>The constructor is not accessible from the client code. Instances of
	 * the context are provided to the extensions by the factory.</b>
	 *
	 * @param {module:x2node-records.Extension[]} Extensions.
	 */
	constructor(extensions) {

		this._extensions = extensions;

		this._validators = new Array();
		this._onLibraryCompleteHandlers = new Array();
		this._onContainerCompleteHandlersStack = new Array();

		this._inContainer = false;
		this._completingLibrary = false;
	}

	/**
	 * Perform final library validation by calling all registered validators.
	 *
	 * @private
	 */
	validateLibrary() {

		this._validators.forEach(validator => {
			validator(this._recordTypes);
		});

		this._validators.length = 0;
	}

	/**
	 * Begin library construction.
	 *
	 * @private
	 * @param {module:x2node-records~RecordTypesLibrary} recordTypes The library.
	 * @returns {module:x2node-records~RecordTypesLibrary} Extended library.
	 */
	extendLibrary(recordTypes) {

		return this._recordTypes = this._extensions.reduce(
			(res, extension) => (
				extension.extendRecordTypesLibrary ?
					extension.extendRecordTypesLibrary(this, res) : res
			),
			recordTypes
		);
	}

	/**
	 * Begin properties container construction.
	 *
	 * @private
	 * @param {module:x2node-records~PropertiesContainer} container The
	 * container.
	 * @returns {module:x2node-records~PropertiesContainer} Extended container.
	 */
	extendContainer(container) {

		this._inContainer = true;
		this._onContainerCompleteHandlersStack.push(new Array());

		return this._extensions.reduce(
			(res, extension) => (
				extension.extendPropertiesContainer ?
					extension.extendPropertiesContainer(this, res) : res
			),
			container
		);
	}

	/**
	 * Begin property descriptor construction.
	 *
	 * @private
	 * @param {module:x2node-records~PropertyDescriptor} propDesc The
	 * descriptor.
	 * @returns {module:x2node-records~PropertyDescriptor} Extended descriptor.
	 */
	extendProperty(propDesc) {

		return this._extensions.reduce(
			(res, extension) => (
				extension.extendPropertyDescriptor ?
					extension.extendPropertyDescriptor(this, res) : res
			),
			propDesc
		);
	}

	/**
	 * Complete library construction.
	 *
	 * @private
	 */
	completeLibrary() {

		this._completingLibrary = true;
		for (let handler of this._onLibraryCompleteHandlers)
			handler(this._recordTypes);
		this._completingLibrary = false;

		this._onLibraryCompleteHandlers.length = 0;
	}

	/**
	 * Complete properties container construction.
	 *
	 * @private
	 * @param {module:x2node-records~PropertiesContainer} container The
	 * container.
	 * @returns {module:x2node-records~PropertiesContainer} The container.
	 */
	completeContainer(container) {

		const handlers = this._onContainerCompleteHandlersStack.pop();
		this._inContainer = (this._onContainerCompleteHandlersStack.length > 0);

		handlers.forEach(handler => {
			handler(container);
		});

		return container;
	}


	/**
	 * Create nested properties container.
	 *
	 * @param {module:x2node-records~PropertyDescriptor} containerPropDesc
	 * Descriptor of the container property in the parent container.
	 * @param {Object} containerDef Container definition.
	 * @returns {module:x2node-records~PropertiesContainer} The new container.
	 */
	createPropertiesContainer(containerPropDesc, containerDef) {

		return this.completeContainer(
			this.extendContainer(
				new PropertiesContainer(
					containerPropDesc.container.recordTypeName,
					containerPropDesc.container.nestedPath +
						containerPropDesc.name + '.',
					containerDef
				)
			).addProperties(this)
		);
	}

	/**
	 * Add record type to the record types library. This method can only be
	 * called from a handler added to the context via the
	 * [onLibraryComplete]{@link module:x2node-records~RecordTypesLibraryFactoryContext#onLibraryComplete}
	 * method.
	 *
	 * @param {(string|Symbol)} recordTypeName Record type name.
	 * @param {Object} recordTypeDef Record type definition.
	 * @throws {module:x2node-common.X2UsageError} If record type with the same
	 * name already exists of if called from a wrong place in the extension.
	 */
	addRecordType(recordTypeName, recordTypeDef) {

		if (!this._completingLibrary)
			throw new common.X2UsageError('Wrong invocation.');

		if (this._recordTypes.hasRecordType(recordTypeName))
			throw new common.X2UsageError(
				'Record type ' + String(recordTypeName) + ' already exists.');

		this._recordTypes.addRecordType(this, recordTypeName, recordTypeDef);
	}

	/**
	 * Register validator invoked after the library completion.
	 *
	 * @param {Function} validator The validator function that receives the
	 * complete record types library.
	 */
	onLibraryValidation(validator) {

		this._validators.push(validator);
	}

	/**
	 * Perform work upon record types library completion. The handlers are called
	 * right after all record types are added to the library but before the
	 * registered library validators are called.
	 *
	 * @param {Function} handler The handler function that receives the record
	 * type library.
	 */
	onLibraryComplete(handler) {

		this._onLibraryCompleteHandlers.push(handler);
	}

	/**
	 * Perform work upon properties container (either nested object or record
	 * type descriptor) completion. The handlers are called right after all
	 * properties are added to the container. If called from the extension's
	 * [extendPropertyDescriptor]{@link module:x2node-records.Extension#extendPropertyDescriptor}
	 * or
	 * [extendPropertiesContainer]{@link module:x2node-records.Extension#extendPropertiesContainer}
	 * function, the handler is called only when the currently being built
	 * container is complete. If called from the extension's
	 * [extendRecordTypesLibrary]{@link module:x2node-records.Extension#extendRecordTypesLibrary}
	 * function, an error is thrown.
	 *
	 * @param {Function} handler The handler function that receives the
	 * properties container.
	 */
	onContainerComplete(handler) {

		if (!this._inContainer)
			throw new common.X2UsageError('Wrong invocation.');

		this._onContainerCompleteHandlersStack[
			this._onContainerCompleteHandlersStack.length - 1].push(handler);
	}
}


/**
 * Record types library factory.
 *
 * @memberof module:x2node-records
 * @inner
 */
class RecordTypesLibraryFactory {

	/**
	 * <b>The constructor is not accessible from the client code. Instances of
	 * the factory are created by module's
	 * [createLibraryFactory]{@link module:x2node-records.createLibraryFactory}
	 * function.</b>
	 */
	constructor() {

		this._extensions = [ new CoreExtension() ];
	}

	/**
	 * Add record types library extension to the factory.
	 *
	 * @param {module:x2node-records.Extension} extension The extension.
	 * @returns {module:x2node-records~RecordTypesLibraryFactory} This factory.
	 */
	addExtension(extension) {

		this._extensions.push(extension);

		return this;
	}

 	/**
	 * Build record types library using the provided definitions.
	 *
	 * @param {Object} recordTypeDefs Record type definitions.
	 * @returns {module:x2node-records~RecordTypesLibrary} Record types library.
	 * @throws {module:x2node-common.X2UsageError} If any record type definitions
	 * are found invalid.
	 */
	buildLibrary(recordTypeDefs) {

		const ctx = new RecordTypesLibraryFactoryContext(this._extensions);

		const recordTypes = ctx.extendLibrary(
			new RecordTypesLibrary(recordTypeDefs)
		).addRecordTypes(ctx);

		ctx.completeLibrary();
		ctx.validateLibrary();

		return recordTypes;
	}
}

// export the class
module.exports = RecordTypesLibraryFactory;
