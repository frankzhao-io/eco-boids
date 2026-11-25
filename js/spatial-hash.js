((root) => {
  class SpatialHashGrid {
    constructor(width, height, cellSize) {
      this.cellSize = cellSize;
      this.cols = Math.max(1, Math.ceil(width / cellSize));
      this.rows = Math.max(1, Math.ceil(height / cellSize));
      this.buckets = Array.from({ length: this.cols * this.rows }, () => []);
    }

    clear() {
      for (let i = 0; i < this.buckets.length; i++) {
        this.buckets[i].length = 0;
      }
    }

    _cellCoords(x, y) {
      const cx = Math.max(0, Math.min(this.cols - 1, Math.floor(x / this.cellSize)));
      const cy = Math.max(0, Math.min(this.rows - 1, Math.floor(y / this.cellSize)));
      return [cx, cy];
    }

    insert(index, x, y) {
      const [cx, cy] = this._cellCoords(x, y);
      this.buckets[cy * this.cols + cx].push(index);
    }

    queryNeighborhood(x, y, radius, outList) {
      outList.length = 0;
      const span = Math.ceil(radius / this.cellSize);
      const [cx, cy] = this._cellCoords(x, y);
      const minX = Math.max(0, cx - span);
      const maxX = Math.min(this.cols - 1, cx + span);
      const minY = Math.max(0, cy - span);
      const maxY = Math.min(this.rows - 1, cy + span);

      for (let gy = minY; gy <= maxY; gy++) {
        const rowOffset = gy * this.cols;
        for (let gx = minX; gx <= maxX; gx++) {
          const bucket = this.buckets[rowOffset + gx];
          for (let i = 0; i < bucket.length; i++) {
            outList.push(bucket[i]);
          }
        }
      }
      return outList;
    }
  }

  const SpatialHash = { SpatialHashGrid };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpatialHash;
  }
  root.SpatialHash = SpatialHash;
})(typeof window !== 'undefined' ? window : globalThis);
