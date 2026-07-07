import { CHIP_DENOMINATIONS } from '../game/types'

export function breakdownAmountIntoChips(amount: number): number[] {
  const chips: number[] = []
  let remaining = amount

  for (let index = CHIP_DENOMINATIONS.length - 1; index >= 0; index -= 1) {
    const denomination = CHIP_DENOMINATIONS[index]

    while (remaining >= denomination) {
      chips.push(denomination)
      remaining -= denomination
    }
  }

  return chips
}

export function getChipStackStep(chipCount: number): number {
  if (chipCount <= 1) {
    return 0
  }

  return Math.min(0.3, 2.4 / (chipCount - 1))
}

export function getChipStackHeight(chipCount: number, chipSizeRem = 2.75): number {
  if (chipCount <= 0) {
    return 0
  }

  return chipSizeRem + getChipStackStep(chipCount) * (chipCount - 1)
}
