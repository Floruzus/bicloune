export type Bike = {
  id: string
  name: string
  /** Circonférence de roue développée, en mm (ce qui sert réellement au calcul). */
  wheelCircumferenceMm: number
  /** Dentures des plateaux, du plus petit au plus grand. */
  chainrings: number[]
  /** Dentures des pignons, du plus petit au plus grand. */
  cogs: number[]
  createdAt: number
}

export type GearState = {
  /** Index dans bike.chainrings */
  front: number
  /** Index dans bike.cogs */
  rear: number
}
