// Counter Contract in TypeScript
class Counter {
    private value: number;

    constructor(initialValue: number = 0) {
        this.value = initialValue;
    }

    public getValue(): number {
        return this.value;
    }

    public increment() {
        this.value += 1;
        return this.value;
    }

    public decrement() {
        this.value -= 1;
        return this.value;
    }

    public add(amount: number) {
        this.value += amount;
        return this.value;
    }
}

// Example usage
const counter = new Counter(10);
console.log(counter.getValue());    // 10
console.log(counter.increment());   // 11
console.log(counter.add(5));       // 16
console.log(counter.decrement());   // 15