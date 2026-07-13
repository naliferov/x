compare with the queue [https://github.com/mcollina/mqemitter](https://github.com/mcollina/mqemitter)

```javascript
class QueueSimplified {
  constructor() {
    this.front = null;  // Reference to the first element
    this.rear = null;   // Reference to the last element
    this.length = 0;    // Queue size
  }

  // Create a new node
  createNode(data) {
    return { data, next: null };
  }

  // Add an element to the end of the queue - O(1)
  enqueue(element) {
    const newNode = this.createNode(element);

    if (this.isEmpty()) {
      // If the queue is empty, the new node becomes both the first and the last
      this.front = newNode;
      this.rear = newNode;
    } else {
      // Add the new node to the end and update the rear pointer
      this.rear.next = newNode;
      this.rear = newNode;
    }

    this.length++;
    return this.length;
  }

  // Remove and return the first element of the queue - O(1)
  dequeue() {
    if (this.isEmpty()) {
      return null;
    }

    const removedNode = this.front;

    // If this was the last element
    if (this.front === this.rear) {
      this.rear = null;
    }

    this.front = this.front.next;
    this.length--;

    return removedNode.data;
  }

  // Return the first element without removing it - O(1)
  peek() {
    if (this.isEmpty()) {
      return null;
    }
    return this.front.data;
  }

  // Check whether the queue is empty - O(1)
  isEmpty() {
    return this.front === null;
  }

  // Return the queue size - O(1)
  size() {
    return this.length;
  }

  // Clear the queue - O(1)
  clear() {
    this.front = null;
    this.rear = null;
    this.length = 0;
  }

  // Convert the queue to a string for output - O(n)
  print() {
    if (this.isEmpty()) {
      return "Queue is empty";
    }

    let result = [];
    let current = this.front;

    while (current) {
      result.push(current.data);
      current = current.next;
    }

    return result.join(", ");
  }
}

function queueExample() {
  const queue = new QueueSimplified();

  queue.enqueue("First");
  queue.enqueue("Second");
  queue.enqueue("Third");

  console.log("Queue after adding 3 elements:");
  console.log(queue.print());
  console.log("Queue size:", queue.size());

  console.log("First element:", queue.peek());

  console.log("Removed element:", queue.dequeue());
  console.log("Queue after removing an element:");
  console.log(queue.print());

  console.log("Is the queue empty?", queue.isEmpty());

  queue.enqueue("Fourth");
  queue.enqueue("Fifth");
  console.log("Queue after adding new elements:");
  console.log(queue.print());

  // Clear the queue
  queue.clear();
  console.log("Queue after clearing:");
  console.log(queue.print());
  console.log("Is the queue empty?", queue.isEmpty());
}

// Run the example
queueExample();
```
