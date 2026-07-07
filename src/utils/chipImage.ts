import { assetUrl } from './asset'

export function getChipImagePath(value: number): string {
  return assetUrl(`chips/chip_${value}.png`)
}
