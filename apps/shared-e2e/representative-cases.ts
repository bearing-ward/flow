/** Keep the baseline tuple and vary each matrix axis independently. */
export const representativeCombination = (
  indexes: readonly number[]
): boolean => indexes.filter((index) => index !== 0).length <= 1
