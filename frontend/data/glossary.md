Continuous Integration (CI) - integrating and testing code in a shared repository.  
Continuous Delivery (CD) - automatic delivery of code to test and pre-production environments.  
Continuous Deployment (CD) - automatic delivery of code to the production environment.

concurrency - one resource, many consumers parallelism - several recources and many consumers

Dynamic typing (the type is determined at runtime and can change) Weak typing (operations can be performed on different types)

## SOLID

Single Responsibility Principle - A class (or module) should have only **one reason to change** , meaning one responsibility.

Open–Closed Principle - Software entities should be **open for extension** , but **closed for modification** .

Liskov Substitution Principle - Subclasses must be **substitutable** for their base classes without breaking the system.

Interface Segregation Principle - Clients should not depend on interfaces they don’t use. Prefer many small interfaces over one large one.

Dependency Inversion Principle - High-level modules shouldn’t depend on low-level modules; both should depend on **abstractions** .

## GRASP

General Responsibility Assignment Software Patterns

Described in [Craig Larman](http://en.wikipedia.org/wiki/Craig_Larman) 's «Applying UML and Patterns»

Low Coupling High Cohesion Information Expert Creator Controller Polymorphism Pure fabrication Indirection Protected Variations

## OOP

#### encapsulation

placing data and the methods that work on that data into a separate space, and as a rule providing a dedicated means of working with this separate space, usually called an object in OOP.

#### inheritance

the ability to create an entity based on another entity, with the option to subsequently override and extend that entity

#### polymorphism

the ability of a function to handle data of different types

as a rule I recall the saying, one interface - different implementations. that is, we have a parentClass and a childClass that is, the ability of an interface to work with different implementations

**ad-hoc** and **parametric** polymorphism

#### abstraction

## CAP

1.  **Consistency** : All copies of the data in the system are always in agreement. This means that if you change data on one node of the system, all the other nodes in the system will immediately reflect those changes.
    
2.  **Availability** : The system is always ready to respond to requests, even if some components fail. This means that although some parts of the system may fail, other parts can still be available to users.
    
3.  **Partition tolerance** : The system can keep working even if some parts of the system have lost connection with each other (partitioning). That is, the system can work even when the network between some nodes of the distributed system is unavailable.
    

According to this theorem, in a distributed data system you can guarantee only two of the three properties at the same time

## Consistency

the notion of "consistency" covers a broader range of aspects than just "Referential integrity". Here are several aspects of data consistency:

**ACID** transaction consistency: This aspect ensures that operations on data are either carried out completely or rolled back in case of failures. It includes guarantees of atomicity, consistency, isolation, and durability of transactions.

Consistency in configuration data: In the context of settings and configuration data, it is important that changes are applied consistently and do not lead to an inconsistent state of the system.

## Processor

A processor has only registers.

The registers hold all the data the processor is working with at a given moment. When you add two numbers - those two numbers are loaded from memory into registers, added together, and then offloaded back into memory, or placed on the stack (the stack is also memory. it's just that, unlike the heap - it isn't a set of scattered pointers to chunks of pages allocated by the allocator, but a contiguous chunk whose maximum size is in fact strictly regulated and set at the program's compilation stage. and on some architectures or operating systems there's no way to make it dynamically resizable at all). And besides, a process's stack is usually fenced off from the rest of memory by a special guard page, on architectures with an MMU, in order to catch stack-overflow exceptions.

There are LRU caches, but there is no direct access to them; they are managed by the memory bus.

The stack of OS processes and the stacks of JS virtual machines have little in common.

Think of yourself as a processor. Your pockets are your registers. And the cabinet in your room is your memory. You walk over to the cabinet, take something out of it, put it in your pockets, go and work with what you took, and then put it back in the cabinet again to free up your pockets for new data. Because you have far fewer pockets than drawers in the cabinet. At the same time you don't need to walk over to your pockets, they are always on you - which is why this is the fastest memory.

## GraphQL

No overfetching

The main advantage is that there is a single endpoint to which the frontend composes queries itself.

It's hard with complex queries when there are additional queries to the database with different ids, and especially with different entities that can't be joined with a SQL query.

Introspection (schemas and query autocomplete)

## SOAP

**SOAP (Simple Object Access Protocol)** : SOAP is another protocol for exchanging structured information messages in a distributed computing system. SOAP uses XML to describe the messages that are included in HTTP requests or responses.
