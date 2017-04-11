# X2 Framework for Node.js | Record Types Library

X2 Framework deals with the notion of *records*. Records are objects of a certain type, normally persisted in a database and identified by a unique id. In the code, records are represented by JSON objects. The collection of *record types* assembled into a *record types library* defines the data domain, with which the application operates. Record types define the structure of the records, record properties and their value types, relationships between different record types in the library, etc. A record type definition is a schema for the records of that type, or, using the OOP analogy, record types are like classes and records are like instances or objects of those classes.

## Table of Contents

* [Usage](#usage)
* [Record Type Definitions](#record-type-definitions)
  * [Simple Value Types](#simple-value-types)
    * [The "string" Value Type](#the-string-value-type)
	* [The "number" Value Type](#the-number-value-type)
	* [The "boolean" Value Type](#the-boolean-value-type)
	* [The "datetime" Value Type](#the-datetime-value-type)
  * [Record Id Property](#record-id-property)
  * [Nested Objects](#nested-objects)
  * [Polymorphic Nested Objects](#polymorphic-nested-objects)
  * [References](#references)
  * [Arrays](#arrays)
  * [Maps](#maps)
  * [Views](#views)
* [The Descriptors](#the-descriptors)
  * [RecordTypesLibrary Class](#recordtypeslibrary-class)
  * [PropertiesContainer Class](#propertiescontainer-class)
  * [RecordTypeDescriptor Class](#recordtypedescriptor-class)
  * [PropertyDescriptor Class](#propertydescriptor-class)
* [Extensibility](#extensibility)
  * [Using Extensions](#using-extensions)
  * [Writing Extensions](#writing-extensions)

## Usage

The `x2node-records` module provides the essentials for the application record types library. The library is represented by an instance of `RecordTypesLibrary` class, which can be built by the factory `buildLibrary` function exported by the module. A single library instance is usually created once by the application in the beginning of its lifecycle and is used throughout the runtime. To build a library, the module must be provided with the *library definition* JSON object that includes the *record type definitions*. Here is an example:

```javascript
const records = require('x2node-records');

const recordTypes = records.buildLibrary({
	recordTypes: {
		'Account': {
			properties: {
				'id': {
					valueType: 'number',
					role: 'id'
				},
				'name': {
					valueType: 'string'
				},
				'orderRefs': {
					valueType: 'ref(Order)[]'
				}
			}
		},
		'Product': {
			properties: {
				'id': {
					valueType: 'number',
					role: 'id'
				},
				'name': {
					valueType: 'string'
				}
			}
		},
		'Order': {
			properties: {
				'id': {
					valueType: 'number',
					role: 'id'
				},
				'accountRef': {
					valueType: 'ref(Account)'
				},
				'items': {
					valueType: 'object[]',
					properties: {
						'id': {
							valueType: 'number',
							role: 'id'
						},
						'productRef': {
							valueType: 'ref(Product)'
						},
						'quantity': {
							valueType: 'number'
						}
					}
				}
			}
		}
	}
});
```

The example above defines three record types: "Account", "Product" and "Order". Explanation of the record type definitions follows.

## Record Type Definitions

At the minimum, every record type definition contains a `properties` attribute, which is an object that provides *property definitions*. The keys in the `properties` object are the property names and the values are objects that define the corresponding properties. Every property definition has a `valueType` attribute that defines the property value type. Structurally, a property can be *scalar*, which means it has a single value, an *array*, represented by a JSON array, or a *map*, represented by a JSON object. Array and map properties are sometimes called *collection* properties to distinguish them from the scalar properties.

A property can be *optional* or *required*. When a property is optional it means a record does not have to have a value for that property. By default, scalar properties are required and array and map properties are optional (meaning they can be empty or absent altogether). To override the defaults, a property definition can have a Boolean attribute `optional` that explicitly specifies the optionality.

Also, a property can be *modifiable* or *read-only*. If a property is not modifiable it does not mean it is immutable. It only means that its value cannot be changed directly and explicitely. The property modifiability may be used by other modules to enforce or hint certain logic. By default, id and view properties are assumed to be read-only and all other properties are assumed to be modifiable. To override the defaults, a property definition can include a Boolean attribute `modifiable` that explicitly specifies the modifiability.

A record type definition can also have a `factory` attribute, in which case it is a function that is used by the framework (and perhaps the application as well) whenever it needs to create a new instance of the record type. The function takes no arguments and the record type descriptor object (described later) is provided to it as `this`. For example:

```javascript
class Person {
	...
}

const recordTypes = records.buildLibrary({
	recordTypes: {
		'Person': {
			properties: {
				...
			},
			factory: function() { return new Person(); }
		}
	}
});
```

If `factory` is not specified, a simple `new Object()` is used to create new record instances.

### Simple Value Types

Four simple value types are supported: "string", "number", "boolean" and "datetime".

#### The "string" Value Type

This is a single JSON string value. For example:

```javascript
{
	...
	'Person': {
		properties: {
			...
			'firstName': {
				valueType: 'string'
			},
			'lastName': {
				valueType: 'string'
			},
			...
		}
	},
	...
}
```

Then a record of type `Person` could be:

```json
{
  "firstName": "Billy",
  "lastName": "Bones"
}
```

#### The "number" Value Type

This is a single JSON number value, including integer, floating point, etc. For example:

```javascript
{
	...
	'Person': {
		properties: {
			...
			'worth': {
				valueType: 'number'
			},
			'numShipsServed': {
				valueType: 'number'
			},
			...
		}
	},
	...
}
```

And in a record:

```json
{
  "worth": 250000.37,
  "numShipsServed": 5
}
```

#### The "boolean" Value Type

A single Boolean value:

```javascript
{
	...
	'Person': {
		properties: {
			...
			'availableForHire': {
				valueType: 'boolean'
			},
			...
		}
	},
	...
}
```

And in a record:

```json
{
  "availableForHire": true
}
```

#### The "datetime" Value Type

Represents a single date and time value. In JSON it is represented by a string in ISO 8601 format, which is the value returned by the standard `Date.prototype.toISOString()` function. For example:

```javascript
{
	...
	'Person': {
		properties: {
			...
			'boardedOn': {
				valueType: 'datetime'
			},
			...
		}
	},
	...
}
```

Then in a record it can be:

```json
{
  "boardedOn": "1765-10-05T14:48:00.000Z"
}
```

### Record Id Property

The records are intended to be persistent and every record can be identified by a unique id. Therefore, every record type definition must contain one property that is used as the record id. The record id property is marked by a `role` attribute in its definition with value "id". The value type of the property can only be "string" or "number". For example:

```javascript
{
	...
	'Person': {
		properties: {
			'id': {
				valueType: 'number',
				role: 'id'
			},
			...
		}
	},
	...
}
```

So, a record could look like:

```json
{
  "id": 35066
}
```

Only one id property can be specified for a record type (composite identifiers are not supported).

### Nested Objects

A property can be a nested object. For example:

```javascript
{
	...
	'Person': {
		properties: {
			...
			'address': {
				valueType: 'object',
				properties: {
					'street': {
						valueType: 'string'
					},
					'unit': {
						valueType: 'string',
						optional: true
					},
					'city': {
						valueType: 'string'
					},
					'state': {
						valueType: 'string'
					},
					'zip': {
						valueType: 'string'
					}
				}
			},
			...
		}
	},
	...
}
```

Then in a record it could be:

```json
{
  "address": {
    "street": "42 W 24th St.",
    "city": "New York",
    "state": "NY",
    "zip": "10010"
  }
}
```

The `properties` attributes in the nested object property definition follows the same rules as the one on the record type definition. Multiple nesting levels are supported as well.

As with the record types, a nested object property definition may optionally contain a `factory` attribute providing a function used to create new instances of the nested object. The nested object property descriptor object (described below) is available to the custom factory function as `this`.

### Polymorphic Nested Objects

Sometimes it is necessary to have a nested object property that can have different properties depending on its type. For example, a shopper account may have a payment method on it and different payment methods may need different sets of properties. This is called a *polymorphic nested object* property. Here is an example:

```javascript
{
	...
	'Account': {
		properties: {
			...
			'paymentInfo': {
				valueType: 'object',
				typePropertyName: 'type',
				subtypes: {
					'CREDIT_CARD': {
						properties: {
							'last4Digits': {
								valueType: 'string'
							},
							'expDate': {
								valueType: 'string'
							}
						}
					},
					'ACH_TRANSFER': {
						properties: {
							'accountType': {
								valueType: 'string'
							},
							'last4Digits': {
								valueType: 'string'
							}
						}
					}
				}
			},
			...
		}
	},
	...
}
```

The property is made polymorphic by having the `subtypes` attribute. Every polymorphic object instance must have the *type property*, which identifies its type. The type property name is specified by the definition's `typePropertyName` required attribute. The properties of specific subtypes are defined in the `subtypes` attribute where the keys are the values for the type property.

Given the definition used above, an account record with a credit card payment info could look like:

```json
{
  "paymentInfo": {
    "type": "CREDIT_CARD",
    "last4Digits": "3005",
    "expDate": "2020-04"
  }
}
```

And a record with an ACH transfer payment info:

```json
{
  "paymentInfo": {
    "type": "ACH_TRANSFER",
    "accountType": "CHECKING",
    "last4Digits": "8845"
  }
}
```

When a custom factory function is required for a polymorphic object, the `factory` attribute is specified on each individual subtype definition.

It is also possible to include a `properties` attribute in a polymorphic nested object definition. In that case, the properties defined there are shared by all of the subtypes.

Also, a whole record type can be made polymoprhic by having a `subtypes` attribute. For example:

```javascript
{
	...
	'Event': {
		typePropertyName: 'eventType',
		properties: {
			'id': {
				valueType: 'number',
				role: 'id'
			},
			'happenedOn': {
				valueType: 'datetime'
			}
		},
		subtypes: {
			'OPENED': {
				properties: {
					'openedBy': {
						valueType: 'string'
					}
				}
			},
			'CLOSED': {
				properties: {
					'reason': {
						valueType: 'string'
					}
				}
			}
		}
	},
	...
}
```

A "closed" *Event* record then could look like this:

```json
{
  "id": 234532546,
  "happenedOn": "2017-03-15T22:30:33.000Z",
  "eventType": "CLOSED",
  "reason": "REJECTED"
}
```

### References

Often, different record types in the application's data domain are related and can refer to each other. For example, an *Order* record may contain a reference to a *Product* record. Such references are represented by a special property value type, which identifies allowed target record type (or types, see below). A reference property value is a string comprised of the referred record type name followed by a hash sign followed by the referred record id (for example "Order#2354" or "Product#12", etc.). Here is an example:

```javascript
{
	...
	'Order': {
		properties: {
			'id': {
				valueType: 'number',
				role: 'id'
			},
			...
			'productRef': {
				valueType: 'ref(Product)'
			},
			...
		}
	},
	'Product': {
		properties: {
			'id': {
				valueType: 'number',
				role: 'id'
			},
			...
		}
	},
	...
}
```

Then an *Order* record could be:

```json
{
  "id": 123,
  "productRef": "Product#255"
}
```

That *Order* refers to a *Product* record with id 255.

References can also be polymorphic allowing a property to refer to records of different types. In the property definition, the allowed record types are separated with a pipe sign. For example:

```javascript
{
	...
	'Account': {
		properties: {
			...
			'lastInterestedInRef': {
				valueType: 'ref(Product|Service)'
			},
			...
		}
	},
	'Product': {
		...
	},
	'Service': {
		...
	},
	...
}
```

The `lastInterestedInRef` property on an *Account* record can refer to either a *Product* or a *Service*.

### Arrays

So far, we've seen only scalar properties, which allow only a single value (even if the value is a nested object it is still one single object). Collection properties serve as containers of multiple values. One type of a collection property is an array. The array element value type can be any of the scalar value types discussed above. To define an array property, the value type in the property definition is suffixed with a square brackets pair. Here is an example with multiple array properties:

```javascript
{
	...
	'Account': {
		properties: {
			...
			'scores': {
				valueType: 'number[]'
			},
			'phones': {
				valueType: 'object[]',
				properties: {
					'id': {
						valueType: 'number',
						role: 'id'
					},
					'type': {
						valueType: 'string'
					},
					'number': {
						valueType: 'string'
					}
				}
			},
			'orders': {
				valueType: 'ref(Order)[]'
			},
			...
		}
	},
	...
}
```

Then a record could look like:

```json
{
  "scores": [ 3, 5.6, 10, -1, 0 ],
  "phones": [
    {
      "id": 1,
      "type": "Home",
      "number": "317-255-6677"
    },
    {
      "id": 2,
      "type": "Cell",
      "number": "689-567-0203"
    }
  ],
  "orders": [ "Order#25684", "Order#25722" ]
}
```

By default, the framework assumes that values in a non-object array are unique. This is reported via the array property's descriptor discussed below and may be used by other modules and the application to determine the logic of how they work with the array. To override the default, a `allowDuplicates` attribute can be specified on the array property definition:

```javascript
{
	...
	'Account': {
		properties: {
			...
			'scores': {
				valueType: 'number[]',
				allowDuplicates: true
			},
			...
		}
	},
	...
}
```

### Maps

Another type of collection properties are maps. In the records, maps are represented as nested objects. The difference between a nested object property and a map property is that a map does not have a fixed set of nested property definitions. To define a map property, the property value type is suffixed with a curly braces pair. For example:

```javascript
{
	...
	'Student': {
		properties: {
			...
			'scores': {
				valueType: 'number{}'
			},
			...
		}
	},
	...
}
```

So, a student record could look like:

```json
{
  "scores": {
    "MATH101": 3.6,
    "BIO201": 5.0,
    "ENGLISH120": 4.8
  }
}
```

### Views

It is possible to define *view* properties. A view property inherits definition from another property in the same container, called the *base* property, and allows to selectively override the definition attributes. For example, a view property may represent a nested objects array base property as a map by overriding the value type and adding a key property definition attribute (used by a result set parser module, for example):

```javascript
{
	...
	'Account': {
		properties: {
			...
			'phones': {
				valueType: 'object[]',
				properties: {
					'id': {
						valueType: 'number',
						role: 'id'
					},
					'type': {
						valueType: 'string'
					},
					'number': {
						valueType: 'string'
					}
				}
			},
			'phonesByType': {
				viewOf: 'phones',
				valueType: 'object{}',
				keyPropertyName: 'type'
			}
			...
		}
	},
	...
}
```

Note how the `phonesByType` view property uses `viewOf` attribute in its definition to refer to the base property. Also note that some definition attributes may not be overridden in a view. Those are `properties` and `subtypes`.

Most of the time, the views are used to override extended definition attributes used by other modules, such as scoped collection property filtering and ordering. See [Extensibility](#extensibility).

## The Descriptors

The `RecordTypesLibrary` class returned by the module's `buildLibrary` function provides an API for working with the record types. The API converts the record type and property *definitions* passed to the `buildLibrary` function to the corresponding record type and property *descriptors*, which are API objects exposing properties and methods to the client code. The original definitions objects are always available through the descriptors as well.

### RecordTypesLibrary Class

This is the top class representing the whole record types library. The following methods are exposed:

* `getRecordTypeDesc(recordTypeName)` - Get record type descriptor from the library. The argument is a string (or `Symbol`) that specifies the type name. The returned object is an instance of `RecordTypeDescriptor`. If no specified record type exists, an `X2UsageError` is thrown.

* `hasRecordType(recordTypeName)` - Tell if the specified record type exists. Returns a Boolean `true` or `false`.

* `definition` - The original library definition object passed to the `buildLibrary` function.

### PropertiesContainer Class

Objects of this class describe anything that contains propeties. It matches the `properties` attribute in various definitions. A nested object property provides a properties container to describe the nested object's properties. The `RecordTypeDescriptor` class extends the `PropertiesContainer` class since every record type is a properties container.

A container can also be *polymorphic*. There are two types of polymoprhic containers: container for a polymorphic nested object property and container for a polymorphic reference property. Any polymorphic property has such container associated with it. The container includes special pseudo-properties to describe specific subtypes. A polymorphic nested object (or polymorphic record type) container will have a pseudo-property for each subtype (in addition to the shared properties). Each such pseudo-property will be an optional scalar nested object property encapsulating the properties specific to the subtype. For a polymorphic reference container, the container will contain a property for each allowed referred record type. The property name is the referred record type name and the type is a scalar reference.

A `PropertiesContainer` instance exposes the following properties and methods:

* `recordTypeName` - The name of the record type, to which the container belongs. If the container is the record type descriptor itself, this is the record type name. If the container describes a nested object property, this is the name of the record type, to which the property belongs.

* `nestedPath` - Dot-separated path to the nested object property represented by the container. The path, if present, always ends with a dot. If the container is a record type descriptor, this property contains an empty string. Path to a property of a polymoprhic nested object includes the subtype name as a path element.

* `idPropertyName` - Name of the id property in the container. If the container has no id property, the value is `undefined`.

* `allPropertyNames` - Array of names of all properties in the container.

* `getPropertyDesc(propName)` - Get descriptor of the specified property. The `propName` parameter is a string that specifies the property name (no nested paths are supported). The method returns a `PropertyDescriptor` object. If no such property an `X2UsageError` is thrown.

* `hasProperty(propName)` - Returns a Boolean `true` or `false` telling if the specified property exists.

* `isRecordType()` - Tells if the container is a `RecordTypeDescriptor`. Returns Boolean `true` or `false`. Another way to test if a container is a record type descriptor is to check its `nestedPath` property, which is always an empty string for a record type descriptor.

* `isPolymorphObject()` - Returns `true` for a polymorphic object container. A polymorphic object container will have `subtypes` and `typePropertyName` descriptor properties as well. Plus some of the property descriptors in the container will have their `isSubtype()` method return `true`.

* `isPolymorphRef()` - Returns `true` for a polymorphic reference container. A polymorphic reference container will also have `subtypes` descriptor property. Plus all of the property descriptors in the container will have their `isSubtype()` method return `true`.

* `isPolymorph()` - Returns `true` for a polymorphic container. Equivalent to `isPolymorphObject() || isPolymorphRef()`.

* `typePropertyName` - For a polymoprhic object container, name of the property used in the record instances described by the container to indicate the record instance subtype. Note, that the property has a descriptor accessible via the container's `hasProperty()` and `getPropertyDesc()` methods, but is "hidden" and is not listed in the `allPropertyNames`. The descriptor of a type property is always a scalar, non-modifiable, required "string" and its `isPolymorphObjectType()` method returns `true`.

* `subtypes` - For a polymorphic object container, the list of all subtype names. For a polymoprhic reference container, the list of names of all allowed referred record types.

* `definition` - The definition object used to create the container. For a record type, this is the record type definition object. For a nested object property, this is the nested object property definition object.

* `parentContainer` - For a nested object property this is a reference to the parent `PropertiesContainer`. For a record type descriptor, always `null`.

* `newRecord()` - Creates new, empty record instance for this container. If factory function was provided in the container definition, it is used. Otherwise, a simple `new Object()` is returned.

### RecordTypeDescriptor Class

The `RecordTypeDescriptor` extends the `PropertiesContainer` class and provides the top descriptor of a record type. In addition to the properties and methods exposed by `PropertiesContainer`, the class also exposes the following properties and methods:

* `name` - Record type name. This is the same as what's exposed by the `PropertyContainer`'s `recordTypeName` property.

### PropertyDescriptor Class

This is the "leaf" descriptor object representing an individual record property. The following properties and methods are exposed:

* `name` - Property name.

* `container` - Reference to the `PropertiesContainer`, to which the property belongs.

* `containerChain` - Array of `PropertyContainer`s that leads from the record type down to this property via the chain of nested object properties, if any. The first element in the chain is the record type descriptor, the last element is the property container (same one as in `container` descriptor property).

* `definition` - The original property definition object.

* `isView()` - Returns Boolean `true` if the property is a view of another property.

* `viewOfDesc` - For a view property, `PropertyDescriptor` of the base property.

* `scalarValueType` - Describes property value type. For a scalar property this is the type of the property value itself. For an array or map property, this is the type of the array or map elements. The following values are possible: "string", "number", "boolean", "datetime", "object" or "ref".

* `isScalar()` - Returns Boolean `true` if the property is scalar.

* `isArray()` - Returns Boolean `true` if the property is an array.

* `isMap()` - Returns Boolean `true` if the property is a map.

* `optional` - Boolean `true` if the property is optional and `false` if it is required.

* `modifiable` - Boolean `true` if the property is modifiable.

* `allowDuplicates` - For a non-object array property this is Boolean `true` if duplicate values are allowed.

* `isId()` - Returns Boolean `true` if the property is an id property (the definition has `role` property set to "id").

* `isPolymorphObject()` - Returns Boolean `true` if the property is a polymorphic nested object. A shortcut for `nestedProperties.isPolymorphObject()`.

* `isPolymorphRef()` - Returns Boolean `true` if the property is a reference with multiple targets. Note, that the `scalarValueType` in this case is `object`, not `ref` (see `nestedProperties` property description below). This is a shortcut for `nestedProperties.isPolymorphRef()`.

* `isSubtype()` - Returns Boolean `true` if the property is a pseudo-property representing a subtype in a polymorphic container. Such property itself can be either a nested object or a reference property.

* `isPolymorphObjectType()` - Returns `true` if the descriptor if for a polymorphic object type "hidden" property.

* `isRef()` - Returns Boolean `true` if the property is a **non-polymorphic** reference (that is the `scalarValueType` property is "ref").

* `refTarget` - Name of the referred record type for a non-polymorphic reference property.

* `refTargets` - For a polymorphic reference property, array of names of all allowed referred record types. This is a shortcut for `nestedProperties.subtypes`.

* `nestedProperties` - For a nested object property, `PropertiesContainer` of the nested object's properties. For a non-polymorphic reference property, the referred `RecordTypeDescriptor`. For a polymorphic nested object, a `PropertiesContainer` with pseudo-properties that use the subtype names and describe each subtype as a nested object property. The container also includes the shared properties defined in the `properties` attribute, if any. For a polymorphic reference property, also a `PropertiesContainer` with pseudo-properties, each using the target record type name as its name and having a non-polymorphic reference type.

## Extensibility

The `x2node-records` modules provides the foundation for the record types library. More functionality to the library is added using *extensions*. Many of the other X2 Framework modules are such extensions themselves and must be added to the library at the time of its construction if it is to be used with those modules. Extensions may utilise additional attributes on the definitions, add properties and methods to the descriptors, impose certain constraints on the data definitions.

### Using Extensions

To use an extension it needs to be added to the records module via its `with` function before the library is constructed by the `buildLibrary` function. The `with` function can take multiple arguments, each of which is an extension to use. The order, in which the etensions are listed is often important. Here is an example:

```javascript
const records = require('x2node-records');
const rsparser = require('x2node-rsparser');
const dbos = require('x2node-dbos');

const recordTypes = records.with(rsparser, dbos).buildLibrary({
	...
});
```

Note how the framework's modules are extensions themselves. Many of these modules will refuse to use the library unless it is extended with them.

Refer to the corresponding extensions documentation for the additional definition attributes that they use and other usage information.

### Writing Extensions

*This topic will be covered in the later versions of this manual.*
