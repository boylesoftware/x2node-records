'use strict';

const common = require('x2node-common');

const RecordTypesLibrary = require('./record-types-library.js');
const PropertiesContainer = require('./properties-container.js');
const CoreExtension = require('./core.js');


/**
 * Context used during the building of a record types library by the factory. The
 * context is used by the library extensions to perform work on completion of
 * various descriptors.
 *
 * @memberof module:x2node-records
 * @inner
 */
class LibraryConstructionContext {

	/**
	 * <strong>Note:</strong> The constructor is not accessible from the client
	 * code. Instances of the context are provided to the extensions by the
	 * factory.
	 *
	 * @private
	 * @param {Array.<module:x2node-records.Extension>} Extensions.
	 */
	constructor(extensions) {

		this._extensions = extensions;

		this._validators = new Array();
		this._onLibraryCompleteHandlersPlan = {
			ctxHandlers: null,
			byProperties: extensions.map(() => new Array()),
			byContainers: extensions.map(() => new Array()),
			byLibrary: new Array()
		};
		this._onContainerCompleteHandlersPlansStack = new Array();

		this._inContainer = false;
		this._completingContainer = null;
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

		this._onLibraryCompleteHandlersPlan.ctxHandlers =
			this._onLibraryCompleteHandlersPlan.byLibrary;

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
		this._onContainerCompleteHandlersPlansStack.push({
			ctxHandlers: null,
			byProperties: this._extensions.map(() => new Array()),
			byContainer: new Array()
		});

		return this._extensions.reduce(
			(res, extension, i) => {
				this._onLibraryCompleteHandlersPlan.ctxHandlers =
					this._onLibraryCompleteHandlersPlan.byContainers[i];
				const onContainerCompleteHandlersPlan =
					this._onContainerCompleteHandlersPlansStack[
						this._onContainerCompleteHandlersPlansStack.length - 1];
				onContainerCompleteHandlersPlan.ctxHandlers =
					onContainerCompleteHandlersPlan.byContainer;
				return (
					extension.extendPropertiesContainer ?
						extension.extendPropertiesContainer(this, res) : res
				);
			},
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
			(res, extension, i) => {
				this._onLibraryCompleteHandlersPlan.ctxHandlers =
					this._onLibraryCompleteHandlersPlan.byProperties[i];
				const onContainerCompleteHandlersPlan =
					this._onContainerCompleteHandlersPlansStack[
						this._onContainerCompleteHandlersPlansStack.length - 1];
				onContainerCompleteHandlersPlan.ctxHandlers =
					onContainerCompleteHandlersPlan.byProperties[i];
				return (
					extension.extendPropertyDescriptor ?
						extension.extendPropertyDescriptor(this, res) : res
				);
			},
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
		const handlers = new Array();
		let handlersCalled;
		do {
			handlers.length = 0;
			this._onLibraryCompleteHandlersPlan.byProperties.forEach(hs => {
				hs.forEach(handler => {
					handlers.push(handler);
				});
				hs.length = 0;
			});
			this._onLibraryCompleteHandlersPlan.byContainers.forEach(hs => {
				hs.forEach(handler => {
					handlers.push(handler);
				});
				hs.length = 0;
			});
			this._onLibraryCompleteHandlersPlan.byLibrary.forEach(handler => {
				handlers.push(handler);
			});
			this._onLibraryCompleteHandlersPlan.byLibrary.length = 0;
			this._onLibraryCompleteHandlersPlan.ctxHandlers =
				this._onLibraryCompleteHandlersPlan.byLibrary;
			handlersCalled = 0;
			handlers.forEach(handler => {
				handler(this._recordTypes);
				handlersCalled++;
			});
		} while (handlersCalled > 0);
		this._completingLibrary = false;
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

		const onContainerCompleteHandlersPlan =
			this._onContainerCompleteHandlersPlansStack[
				this._onContainerCompleteHandlersPlansStack.length - 1];
		this._completingContainer = container;
		const handlers = new Array();
		let handlersCalled;
		do {
			handlers.length = 0;
			onContainerCompleteHandlersPlan.byProperties.forEach(hs => {
				hs.forEach(handler => {
					handlers.push(handler);
				});
				hs.length = 0;
			});
			onContainerCompleteHandlersPlan.byContainer.forEach(handler => {
				handlers.push(handler);
			});
			onContainerCompleteHandlersPlan.byContainer.length = 0;
			onContainerCompleteHandlersPlan.ctxHandlers =
				onContainerCompleteHandlersPlan.byContainer;
			handlersCalled = 0;
			handlers.forEach(handler => {
				handler(container);
				handlersCalled++;
			});
		} while (handlersCalled > 0);
		this._completingContainer = null;

		this._onContainerCompleteHandlersPlansStack.pop();
		this._inContainer = (
			this._onContainerCompleteHandlersPlansStack.length > 0);

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
					containerDef,
					containerPropDesc.container
				)
			).addProperties(this)
		);
	}

	/**
	 * Add record type to the record types library.
	 *
	 * <p>This method can only be called from a handler added to the context via
	 * the
	 * [onLibraryComplete()]{@link module:x2node-records~LibraryConstructionContext#onLibraryComplete}
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
	 * Add hidden property to the current context properties container. The
	 * property descriptor will be available via the container's
	 * <code>getPropertyDesc()</code> method but will be not listed in the
	 * container's <code>allPropertyNames</code> list.
	 *
	 * <p>This method can only be called from a handler added to the context via
	 * the
	 * [onContainerComplete()]{@link module:x2node-records~LibraryConstructionContext#onContainerComplete}
	 * method.
	 */
	addHiddenProperty(propName, propDef) {

		if (!this._completingContainer)
			throw new common.X2UsageError('Wrong invocation.');

		if (this._completingContainer.hasProperty(propName))
			throw new common.X2UsageError(
				'Property ' + propName + ' already exists.');

		this._completingContainer.addProperty(this, propName, propDef);
	}

	/**
	 * Register validator invoked after the library completion.
	 *
	 * @param {function} validator The validator function that receives the
	 * complete record types library as its only argument.
	 */
	onLibraryValidation(validator) {

		this._validators.push(validator);
	}

	/**
	 * Perform work upon record types library completion. The handlers are called
	 * right after all record types are added to the library but before the
	 * registered library validators are called.
	 *
	 * @param {function} handler The handler function that receives the record
	 * type library as its only argument.
	 */
	onLibraryComplete(handler) {

		this._onLibraryCompleteHandlersPlan.ctxHandlers.push(handler);
	}

	/**
	 * Perform work upon properties container (either nested object or record
	 * type descriptor) completion. The handlers are called right after all
	 * properties are added to the container. If called from the extension's
	 * [extendPropertyDescriptor()]{@link module:x2node-records.Extension#extendPropertyDescriptor}
	 * or
	 * [extendPropertiesContainer()]{@link module:x2node-records.Extension#extendPropertiesContainer}
	 * function, the handler is called only when the currently being built
	 * container is complete. If called from the extension's
	 * [extendRecordTypesLibrary()]{@link module:x2node-records.Extension#extendRecordTypesLibrary}
	 * function, an error is thrown.
	 *
	 * @param {function} handler The handler function that receives the
	 * properties container as its only argument.
	 */
	onContainerComplete(handler) {

		if (!this._inContainer)
			throw new common.X2UsageError('Wrong invocation.');

		const onContainerCompleteHandlersPlan =
			this._onContainerCompleteHandlersPlansStack[
				this._onContainerCompleteHandlersPlansStack.length - 1];
		onContainerCompleteHandlersPlan.ctxHandlers.push(handler);
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
	 * <strong>Note:</strong> The constructor is not accessible from the client
	 * code. Instances of the factory are created by module's
	 * [createLibraryFactory()]{@link module:x2node-records.createLibraryFactory}
	 * function.
	 *
	 * @protected
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
	 * @param {Object} libraryDef Library definition object including record type
	 * definitions.
	 * @returns {module:x2node-records~RecordTypesLibrary} Record types library.
	 * @throws {module:x2node-common.X2UsageError} If any record type definitions
	 * are found invalid.
	 */
	buildLibrary(libraryDef) {

		const ctx = new LibraryConstructionContext(this._extensions);

		const recordTypes = ctx.extendLibrary(
			new RecordTypesLibrary(libraryDef)
		).addRecordTypes(ctx);

		ctx.completeLibrary();
		ctx.validateLibrary();

		return recordTypes;
	}
}

// export the class
module.exports = RecordTypesLibraryFactory;
