// src/utils/binary-heap.ts
var BinaryHeap = class {
  constructor(maxsize, scoreFn) {
    this.size = 0;
    this.maxsize = 0;
    this.size = 0;
    this.maxsize = maxsize;
    this.data = new Array(this.maxsize + 1);
    this.scoreFn = scoreFn;
  }
  getParent(index) {
    return Math.round(index / 2);
  }
  getLeftChild(index) {
    return 2 * index;
  }
  getRightChild(index) {
    return 2 * index + 1;
  }
  isLeaf(index) {
    return index >= this.size / 2 && index <= this.size;
  }
  swap(indexA, indexB) {
    const tmp = this.data[indexA];
    this.data[indexA] = this.data[indexB];
    this.data[indexB] = tmp;
  }
  heapify(index) {
    if (this.isLeaf(index))
      return;
    const scoreFn = this.scoreFn;
    const data = this.data;
    const e = data[index];
    const leftChildIndex = this.getLeftChild(index);
    const rightChildIndex = this.getRightChild(index);
    if (scoreFn(e) > scoreFn(data[leftChildIndex]) || scoreFn(e) > scoreFn(data[rightChildIndex])) {
      if (scoreFn(data[leftChildIndex]) < scoreFn(data[rightChildIndex])) {
        this.swap(index, leftChildIndex);
        this.heapify(this.getLeftChild(index));
      } else {
        this.swap(index, rightChildIndex);
        this.heapify(this.getRightChild(index));
      }
    }
  }
  insert(e) {
    if (this.size >= this.maxsize)
      return;
    const scoreFn = this.scoreFn;
    this.data[++this.size] = e;
    let currentIndex = this.size;
    while (scoreFn(this.data[currentIndex]) < scoreFn(this.data[this.getParent(currentIndex)])) {
      this.swap(currentIndex, this.getParent(currentIndex));
      currentIndex = this.getParent(currentIndex);
    }
  }
  pop() {
    const e = this.data[1];
    this.data[1] = this.data[this.size - 1];
    this.size--;
    this.heapify(1);
    return e;
  }
};
export {
  BinaryHeap
};
//# sourceMappingURL=binary-heap.js.map
