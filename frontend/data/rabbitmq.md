AMQP, STOMP, MQTT, HTTP API  
  
The routing algorithm used depends on the exchange type and rules called bindings  
  
a bounded channel prefetch which limits the number of outstanding ("in progress") deliveries on a channel. With automatic acknowledgements, however, there is no such limit by definition  
  
basic.ack, basic.nack, basic.reject  
  
Message loss: Messages can be lost in transit through the queue due to failures or malfunctions. To avoid this problem, RabbitMQ allows you to use delivery acknowledgements  
  
Duplication: To solve this problem you can use unique identifiers  
  
Wrong order: To solve this you can set message priorities or use additional information in the messages to determine the correct processing order.  
  
Failure during processing: a message may need to be reprocessed. RabbitMQ supports reprocessing mechanisms through message redelivery mechanisms or forwarding to a special queue for error handling. (dead letter exchanges)  
  
Server failures: If the RabbitMQ server or other servers in the messaging system stop functioning, messages may be undelivered or processed incorrectly. In this case you can use RabbitMQ clustering and replication  
  
Performance and scalability: With a large volume of transactions, performance and scalability problems may arise. To solve this problem you can use horizontal scaling (adding new nodes) and optimizing RabbitMQ configuration parameters.
