export default {
    /**
     * 随机打乱数组位置
     * @param {*Array} array 
     * @returns 打乱后地方数组
     */
    shuffleArray: function (array) {
        // Math.random() 区间为[0, 1)
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1)); // 随机生成一个位置
          // 交换位置
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      },
}
