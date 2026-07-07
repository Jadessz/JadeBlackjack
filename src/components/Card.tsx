import { useEffect, useState } from 'react'
import { getCardImagePath, CARD_BACK_IMAGE } from '../utils/cardImage'
import type { Card as CardType } from '../game/types'

interface CardProps {
  card?: CardType
  faceDown?: boolean
  revealing?: boolean
  dealing?: boolean
  delay?: number
}

export function Card({ card, faceDown = false, revealing = false, dealing = false, delay = 0 }: CardProps) {
  const [flipped, setFlipped] = useState(false)
  const [shouldEnter] = useState(() => !dealing)

  useEffect(() => {
    if (revealing) {
      const frame = requestAnimationFrame(() => setFlipped(true))
      return () => cancelAnimationFrame(frame)
    }
  }, [revealing])

  useEffect(() => {
    if (faceDown && !revealing) {
      setFlipped(false)
    }
  }, [faceDown, revealing])

  if (!card) {
    return (
      <div className="card card--static">
        <img src={CARD_BACK_IMAGE} alt="Card back" draggable={false} />
      </div>
    )
  }

  const showFlipLayout = revealing || flipped
  const motionClass = dealing ? 'card--dealing' : shouldEnter ? 'card--entry' : ''

  if (showFlipLayout) {
    return (
      <div
        className={`card card--flip card--static${flipped ? ' card--flipped' : ''}`}
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="card__inner">
          <div className="card__face card__face--back">
            <img src={CARD_BACK_IMAGE} alt="Card back" draggable={false} />
          </div>
          <div className="card__face card__face--front">
            <img
              src={getCardImagePath(card)}
              alt={`${card.rank} of ${card.suit}`}
              draggable={false}
            />
          </div>
        </div>
      </div>
    )
  }

  const src = faceDown ? CARD_BACK_IMAGE : getCardImagePath(card)
  const alt = faceDown ? 'Card back' : `${card.rank} of ${card.suit}`

  return (
    <div
      className={`card card--static${motionClass ? ` ${motionClass}` : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <img src={src} alt={alt} draggable={false} />
    </div>
  )
}
