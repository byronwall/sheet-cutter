type PanelId = string;

export interface Panel {
  height: number;
  width: number;

  material: string;

  id: PanelId;
}

export interface CutJob {
  availablePanels: Panel[];
  neededPanels: Panel[];
  settings: CutJobSetting;
}

export enum CutDirection {
  VERTICAL = 1,
  HORIZONTAL = 2,
}

export interface CutJobStep {
  panelIdToCut: PanelId;
  cutDirection: CutDirection;

  /** distance from the nominal corner */
  cutPosition: number;
}

export interface CutJobResults {
  panelInventory: Panel[];
  panelsMade: Panel[];
  panelsNotPlaced: Panel[];
  cutsInOrder: CutJobStep[];
}

export interface CutJobSetting {
  bladeKerf: number;
}
