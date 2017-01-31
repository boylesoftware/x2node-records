# X2 Framework for Node.js | Record Types Library

X2 Framework deals with the notion of *records*. Records are objects of a certain type, normally persisted in a database and identified by a unique id. In the code, records are represented by JSON objects. The collection of *record types* assembled into a *record types library* defines the data domain, with which the application operates. Record types define the structure of the records, record properties and their types, etc. A record type definition is a schema for the records, or, using the OOP analogy, record types are like classes and records are like instances or objects of those classes.

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
* [The Descriptors](#the-descriptors)
  * [RecordTypesLibrary Class](#recordtypeslibrary-class)
  * [PropertiesContainer Class](#propertiescontainer-class)
  * [RecordTypeDescriptor Class](#recordtypedescriptor-class)
  * [PropertyDescriptor Class](#propertydescriptor-class)
* [Extensibility](#extensibility)

## Usage

The `x2node-records` module provides the essentials for the application record types library. The library is represented by an instance of `RecordTypesLibrary` class that can be created using `createRecordTypesLibrary` function exported by the module. A single library instance is usually created by the application once and then used throughout the runtime. When the library is created, it is provided with the *record type definitions* JSON object. For example:

```javascript
const records = require('x2node-records');

const recordTypes = records.createRecordTypesLibrary({
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
				valueType: '[ref(Order)]'
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
				valueType: '[object]',
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
});
```

The example above defines three record types: "Account", "Product" and "Order". Detailed description of the record type definitions follows.

## Record Type Definitions

At the minimum, every record type definition contains a `properties` property, which is an object that provides *property definitions*. The keys in the `properties` object are the property names and the values are objects that define the corresponding properties. Every property definition has a `valueType` property that defines the property value type. Structurally, a property can be *scalar*, which means it has a single value, an *array*, represented by a JSON array, or a *map*, represented by a JSON object.

A record type definition can also have a `factory` property, in which case it is a function that is used to create new instances of the record type. The function takes no arguments and the record type definition object is available to it as `this`. For example:

```javascript
class Person {
	...
}

const recordTypes = new RecordTypesLibrary({
	'Person': {
		properties: {
			...
		},
		factory: function() { return new Person(); }
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
  "worth": 250000.00,
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
			'available': {
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
  "available": true
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

The records are intended to be persistent and every record can be identified by a unique id. Therefore, every record type definition must contain one property that is used as the record id. The record id property is marked by a `role` property in its definition with value "id". The value type of the property can be only "string" or "number". For example:

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

The `properties` object in the nested property definition follows the same rules as the one on the record type definition. Naturally, multiple nesting levels are allowed.

As with the record types, a nested property definition may optionally contain a `factory` property providing a function used to create new instances of the nested object. The nested object property definition object is available to the custom factory function as `this`.

### Polymorphic Nested Objects

Sometimes it is necessary to have a nested object property that can have different properties depending on its type. For example, a shopper account may have a payment method on it and different payment methods may need different properties. This is called a *polymorphic nested object* property. Here is an example:

```javascript
{
	...
	'Account': {
		properties: {
			...
			'paymentInfo': {
				valueType: 'object?',
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

The property is marked as polymorphic by the question mark in the value type property (the "object?"). Then, every polymorphic object property instance must have type property, which identifies its type. The type property name is defined by the definition's `typePropertyName` property. The properties for specific subtypes are defined in the `subtypes` map where the keys are the values for the type property.

Given the example definition above, an account record with a credit card payment info could look like:

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

When a custom factory function is required for a polymorphic object, the `factory` property is specified on each individual subtype definition.

### References

Often, different record types in the application's data domain are related and can refer to each other. For example, an Order record may contain a reference to a Product record. The references are represented by a special property value type, which identifies allowed target record type (or types, see below). A reference property value is a string comprised of the referred record type name followed by a hash sign followed by the referred record id (for example "Order#2354" or "Product#12", etc.). Here is a definition example:

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

Then an Order record could be:

```json
{
  "id": 123,
  "productRef": "Product#255"
}
```

Which refers to the Product record with id 255.

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

The `lastInterestedInRef` property on an Account record can refer to either a product or a service.

### Arrays

So far, we've seen only scalar properties, which allow only a single value (even if the value is a nested object). Collection properties are also supported. One type of a collection property is an array. The array element value type can be any of the scalar value types discussed up to this point. To define an array property, the value type in the property definition is enclosed in square brackets. Here is an example with multiple array properties:

```javascript
{
	...
	'Account': {
		properties: {
			...
			'scores': {
				valueType: '[number]'
			},
			'phones': {
				valueType: '[object]',
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
				valueType: '[ref(Order)]'
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

Note, that there is one requirement for nested object arrays: the nested objects *must* have an id property. On the other hand, scalar nested objects *may not* have an id property (their id is the parent record id).

### Maps

Another type of collection properties are maps. In the records, maps are represented as nested objects. The difference between a nested object property and a map property is that a map does not have a fixed nested property definitions. To define a map property, the property value type is enclosed in curly braces and a `keyValueType` property is added to specify the map key value type. For example:

```javascript
{
	...
	'Student': {
		properties: {
			...
			'scores': {
				valueType: '{number}',
				keyValueType: 'string'
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

The `keyValueType` may be `string`, `number`, `boolean`, `datetime` or a single target record type reference (for example `ref(Course)`). Regardless of the specified key value type, the key value is always used as a string.

Note, that for nested object maps, unlike nested object arrays, there is no requirement for the nested objects to have an id property since the objects are uniquely identified by the map key.

Also, for nested object and reference maps, instead of using `keyValueType` definition property, the definition may include a `keyPropertyName` property that names the property of the nested object or the referred record type that acts as the map key. As with the `keyValueType`, the key property must be scalar, it may not be a nested object, and if it is a reference property it may not be polymorphic. For example:

```javascript
{
	...
	'Student': {
		properties: {
			...
			'scores': {
				valueType: '{object}',
				keyPropertyName: 'courseCode',
				properties: {
					'courseCode': {
						valueType: 'string'
					},
					'score': {
						valueType: 'number'
					}
				}
			},
			...
		}
	},
	...
}
```

## The Descriptors

The `RecordTypesLibrary` class provides an API for working with the record types. The API converts the record type and property *definitions* provided to the module's `createRecordTypesLibrary` function to the corresponding record type and property *descriptors*, which are API objects providing properties and methods for the clients. The original definition object is always available through the descriptor.

### RecordTypesLibrary Class

This is the top class representing the whole record types library. The following methods are exposed:

* `getRecordTypeDesc(recordTypeName)` - Get record type descriptor from the library. The argument is a string (or `Symbol`) that specifies the type name. The returned object is an instance of `RecordTypeDescriptor`. If no specified record type exists, a `X2UsageError` is thrown.

* `hasRecordType(recordTypeName)` - Tell if the specified record type exists. Returns a Boolean `true` or `false`.

* `addRecordType(recordTypeName, recordTypeDef)` - Add record type to the library. Adding a record type via this method does not modify the original type definitions object used to create the library. Using a `Symbol` as the type name allows other modules to extend the types library in a non-collisional way.

### PropertiesContainer Class

Objects of this class describe anything that contains propeties. It matches the `properties` object in various definitions. A nested object property provides a properties container to describe the nested object's properties. The `RecordTypeDescriptor` class extends the `PropertiesContainer` class since every record type is a properties container.

A `PropertiesContainer` instance exposes the following properties and methods:

* `recordTypeName` - Read-only string (or `Symbol`) property that provides the name of the record type, to which the container belongs. If the container is the record type descriptor itself, this is the record type name. If the container describes a nested object property, this is the name of the record type, to which the property belongs.

* `nestedPath` - Read-only string property that provides dot-separated path to the nested object property represented by the container. The path, if present, always ends with a dot. If the container is a record type descriptor, this property contains an empty string. Path to a property of a polymoprhic nested object includes the subtype name as a path element.

* `idPropertyName` - Read-only string property that provides the name of the id property in the container. If the container has no id property, the value is `undefined`.

* `allPropertyNames` - Read-only string array that contains names of all properties in the container.

* `getPropertyDesc(propName)` - Get descriptor of the specified property. The `propName` parameter is a string that specifies the property name (no nested paths are supported). The method returns a `PropertyDescriptor` object. If no such property an `X2UsageError` is thrown.

* `hasProperty(propName)` - Returns a Boolean `true` or `false` telling if the specified property exists.

### RecordTypeDescriptor Class

The `RecordTypeDescriptor` extends the `PropertiesContainer` class and provides the top descriptor of a record type. In addition to the properties and methods exposed by `PropertiesContainer`, the class also exposes the following properties and methods:

* `name` - Read-only string (or `Symbol`) with the record type name. This is the same as what's exposed by the `PropertyContainer`'s `recordTypeName` property.

* `definition` - Read-only property that exposes the original record type definition object passed to the library constructor.

* `newRecord()` - Create and return a new instance of the record type. If the record type definition has a `factory` property, the function associated with the property is invoked and its result is returned. Otherwise, a simple `new Object()` is used.

### PropertyDescriptor Class

This is the "leaf" descriptor object representing an individual record property. The following properties and methods are exposed:

* `name` - Read-only property name string.

* `container` - Read-only reference to the `PropertiesContainer`, to which the property belongs.

* `definition` - Read-only original property definition object.

* `scalarValueType` - Read-only string property that describes the property value type. For a scalar property this is the type of the property value itself. For an array or map property, this is the type of the array or map elements. The following values are possible: "string", "number", "boolean", "datetime", "object" or "ref".

* `isScalar()` - Method that returns Boolean `true` if the property is scalar.

* `isArray()` - Method that returns Boolean `true` if the property is an array.

* `isMap()` - Method that returns Boolean `true` if the property is a map.

* `keyValueType` - Read-only string property that for a map property provides scalar value type of the map keys. May be "string", "number", "boolean", "datetime" or "ref".

* `keyRefTarget` - Read-only string property that provides the target record type name if the `keyValueType` is a reference.

* `keyPropertyName` - Read-only string property that for a nested object or reference map property contains the name of the property in the nested object or the referred record type that acts as the map key.

* `isPolymorph()` - Method that returns Boolean `true` if the property is a polymorphic nested object or a reference with multiple allowed target record types.

* `isId()` - Method that returns Boolean `true` if the property is an id property (the definition has `role` property set to "id").

* `isRef()` - Method that returns Boolean `true` if the property is a reference (in which case the `scalarValueType` property is "ref").

* `refTarget` - Read-only string property that names the target record type for a reference property.

* `refTargets` - Read-only string array property containing the names of allowed target record types for a polymorphic reference property.

* `nestedProperties` - For a nested object property, read-only `PropertiesContainer` property that describes properties of the nested object. If the object is polymorphic, the property is an object with keys being the subtype names and the values being the corresponding `PropertiesContainer` objects.

* `newObject()` - Method used to create instances of the nested object for a nested object property.

* `newObject(subtypeName)` - Create new instance of a polymorphic nested object property. The `subtypeName` string argument provides the subtype name.

## Extensibility

The record type and property definition objects do not restrict what properties they can have. The original definition objects are also always available to the client code through the `definition` property of the corresponding descriptor objects provided by the API. This allows extending the use of the record types library for other modules that can add their own properties to the definitions.
