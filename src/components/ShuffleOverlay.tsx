import { SHUFFLE_MS } from '../game/types'
import { CARD_BACK_IMAGE } from '../utils/cardImage'

const HALF_SIZE = 8
const RIFFLE_COUNT = 16
const INITIAL_LAYERS = 6

function ShuffleCardFace({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div className={`shuffle-card${className ? ` ${className}` : ''}`} style={style}>
      <img src={CARD_BACK_IMAGE} alt="" draggable={false} />
    </div>
  )
}

export function ShuffleOverlay() {
  return (
    <div className="shuffle-overlay" aria-live="polite" aria-label="Shuffling cards">
      <div className="shuffle-overlay__panel">
        <div className="shuffle-scene">
          <div className="shuffle-initial" aria-hidden="true">
            {Array.from({ length: INITIAL_LAYERS }, (_, layer) => (
              <ShuffleCardFace
                key={`initial-${layer}`}
                className="shuffle-initial__card"
                style={{ '--layer': layer } as React.CSSProperties}
              />
            ))}
          </div>

          <div className="shuffle-pack shuffle-pack--left" aria-hidden="true">
            {Array.from({ length: HALF_SIZE }, (_, layer) => (
              <ShuffleCardFace
                key={`left-${layer}`}
                className="shuffle-pack__card"
                style={{ '--layer': layer } as React.CSSProperties}
              />
            ))}
          </div>

          <div className="shuffle-pack shuffle-pack--right" aria-hidden="true">
            {Array.from({ length: HALF_SIZE }, (_, layer) => (
              <ShuffleCardFace
                key={`right-${layer}`}
                className="shuffle-pack__card"
                style={{ '--layer': layer } as React.CSSProperties}
              />
            ))}
          </div>

          <div className="shuffle-merge" aria-hidden="true">
            {Array.from({ length: RIFFLE_COUNT }, (_, index) => {
              const fromLayer = HALF_SIZE - 1 - Math.floor(index / 2)

              return (
                <ShuffleCardFace
                  key={`riffle-${index}`}
                  className={`shuffle-riffle ${index % 2 === 0 ? 'shuffle-riffle--left' : 'shuffle-riffle--right'}`}
                  style={
                    {
                      '--i': index,
                      '--land': index,
                      '--from-layer': fromLayer,
                    } as React.CSSProperties
                  }
                />
              )
            })}
          </div>

          <div className="shuffle-pile-shadow" aria-hidden="true" />
        </div>

        <p className="shuffle-overlay__title">Shuffling</p>
        <div
          className="shuffle-overlay__progress"
          role="progressbar"
          aria-label="Shuffling progress"
          aria-valuemin={0}
          aria-valuemax={100}
          style={{ '--shuffle-duration': `${SHUFFLE_MS}ms` } as React.CSSProperties}
        >
          <div className="shuffle-overlay__progress-fill" />
        </div>
      </div>
    </div>
  )
}
