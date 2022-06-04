import _ from "lodash";
import {
  CutDirection,
  CutJob,
  CutJobResults,
  CutJobSetting,
  CutJobStep,
  Panel,
  PanelPos,
} from "./model";

let nextId = 1;

export function determineCutOrderForJob(job: CutJob): CutJobResults {
  // steps

  // sort the panels and process in order

  const panelInventory = _.cloneDeep(job.availablePanels);

  // inventory points to itself
  panelInventory.forEach((c) => {
    c.originalSource = c.id;
    c.parentSource = c.id;
  });

  const panelsNeed = _.cloneDeep(job.neededPanels);
  panelsNeed.sort(comparePanels);

  const panelsNotPlaced = [];
  const panelsMade = [];
  const cutsInOrder = [];

  // pick the biggest piece that is needed

  while (panelsNeed.length) {
    const panelToPlace = panelsNeed.shift();

    if (panelToPlace === undefined) {
      console.log("panel was undefined");
      break;
    }

    // find all panels that can hold it

    const panelsToHoldIt = panelInventory
      .filter((c) => c.material === panelToPlace.material)
      .filter((c) => willFirstPanelHoldSecond(c, panelToPlace, job.settings));

    // nowhere to put it - add to bad list
    if (panelsToHoldIt.length === 0) {
      panelsNotPlaced.push(panelToPlace);
      console.log("could not place", panelToPlace);
      continue;
    }

    // choose the best panel that can hold it
    // compute a "waste"

    const bestHoldingPanel = _.maxBy(panelsToHoldIt, (c) =>
      getPanelWaste(c, panelToPlace)
    );

    if (bestHoldingPanel === undefined) {
      console.error("could not find best");
      break;
    }

    // remove the known panel since it's going to be split
    _.remove(panelInventory, (c) => c.id === bestHoldingPanel.id);

    // choose best direction on that panel
    // create job steps for each of the cuts needed (may only be one)
    const bestCuts = getBestCut(bestHoldingPanel, panelToPlace, job.settings);

    if (bestCuts.length === 0) {
      // new panel is perfect size -- no cuts needed
      panelsMade.push(bestHoldingPanel);
      continue;
    }

    const cut1 = bestCuts[0];

    const { goodPanel, wastePanel } = getNewPanelsFromCut(
      bestHoldingPanel,
      cut1,
      job.settings
    );

    if (goodPanel === undefined) {
      console.error("failed on a cut?");
      break;
    }
    goodPanel.label = panelToPlace.label;

    cutsInOrder.push(cut1);

    if (wastePanel) {
      panelInventory.push(wastePanel);
    }

    const cut2 = bestCuts[1];

    if (cut2 !== undefined) {
      const { goodPanel: finalPanel, wastePanel: wastePanel2 } =
        getNewPanelsFromCut(goodPanel, cut2, job.settings);

      if (finalPanel === undefined) {
        console.warn("panel was undefined?");
        break;
      }

      panelsMade.push(finalPanel);
      if (wastePanel2) {
        panelInventory.push(wastePanel2);
      }
      cutsInOrder.push(cut2);
    } else {
      panelsMade.push(goodPanel);
    }

    // make cut
    // update the panel inventory based on those cuts and kerf

    // repeat this loop, storing job steps and panel list
  }
  // when done... return results...

  return {
    panelInventory,
    panelsMade,
    panelsNotPlaced,
    cutsInOrder,
  };
}

/**
 * Will supply the results of a cut without modifying originals
 * @param originalPanel Panel to cut - will not be modified
 * @param cut Cut applied to that panel
 */
function getNewPanelsFromCut(
  originalPanel: Panel,
  cut: CutJobStep | undefined,
  settings: CutJobSetting
) {
  if (cut === undefined) {
    console.error("cut undefined");
    return { goodPanel: undefined, wastePanel: undefined };
  }

  const wastePanel = _.cloneDeep(originalPanel);
  wastePanel.id = nextId++;

  const goodPanel = _.cloneDeep(originalPanel);
  goodPanel.id = nextId++;

  // TODO: include steps to get back raw source from here
  goodPanel.parentSourcePos = { left: 0, top: 0 };

  goodPanel.originalSourcePos = addSourcePos(
    originalPanel.originalSourcePos,
    goodPanel.parentSourcePos
  );

  goodPanel.parentSource = originalPanel.id;
  goodPanel.originalSource = originalPanel.originalSource ?? originalPanel.id;

  if (cut.cutDirection === CutDirection.HORIZONTAL) {
    // this will reduce the height by position
    wastePanel.height -= cut.cutPosition + settings.bladeKerf;
    wastePanel.parentSourcePos = {
      top: cut.cutPosition + settings.bladeKerf,
      left: 0,
    };

    goodPanel.height = cut.cutPosition;
  } else {
    wastePanel.width -= cut.cutPosition + settings.bladeKerf;
    wastePanel.parentSourcePos = {
      top: 0,
      left: cut.cutPosition + settings.bladeKerf,
    };

    goodPanel.width = cut.cutPosition;
  }

  wastePanel.height = Math.max(wastePanel.height, 0);
  wastePanel.width = Math.max(wastePanel.width, 0);

  // update waste panel pos
  wastePanel.originalSourcePos = addSourcePos(
    originalPanel.originalSourcePos,
    wastePanel.parentSourcePos
  );
  wastePanel.parentSource = originalPanel.id;
  wastePanel.originalSource = originalPanel.originalSource ?? originalPanel.id;

  return { goodPanel, wastePanel };
}

function addSourcePos(
  pos1: PanelPos | undefined,
  pos2: PanelPos | undefined
): PanelPos {
  if (pos1 === undefined) {
    pos1 = { top: 0, left: 0 };
  }

  if (pos2 === undefined) {
    pos2 = { top: 0, left: 0 };
  }

  return { left: pos1.left + pos2.left, top: pos1.top + pos2.top };
}

function getBestCut(
  parentPanel: Panel,
  childPanel: Panel,
  settings: CutJobSetting
): CutJobStep[] {
  // test if the piece should be rotated -- will do the calc twice

  // do this based on keeping the largest biggest area pieces

  const wasteHeight = parentPanel.height - childPanel.height;
  const wasteWidth = parentPanel.width - childPanel.width;

  const mustRotate = wasteHeight < 0 || wasteWidth < 0;

  const wasteHeightRot = parentPanel.height - childPanel.width;
  const wasteWidthRot = parentPanel.width - childPanel.height;

  const canRotate = wasteHeightRot >= 0 && wasteWidthRot >= 0;

  // first cut is for the height

  // figure out if rotating is better

  const normalCuts = getBestCutSingleTest(
    childPanel.width,
    childPanel.height,
    parentPanel,
    settings
  );
  const rotatedCuts = getBestCutSingleTest(
    childPanel.height,
    childPanel.width,
    parentPanel,
    settings
  );

  if (mustRotate) {
    return rotatedCuts.cuts;
  }

  if (!canRotate || normalCuts.biggestArea > rotatedCuts.biggestArea) {
    return normalCuts.cuts;
  }

  return rotatedCuts.cuts;
}

interface CutTestResult {
  cuts: CutJobStep[];
  biggestArea: number;
}

function getBestCutSingleTest(
  widthToUse: number,
  heightToUse: number,
  parentPanel: Panel,
  settings: CutJobSetting
): CutTestResult {
  const epsilon = 0.001;

  const needsVerticalCut = parentPanel.width - widthToUse > epsilon;
  const needsHorizontalCut = parentPanel.height - heightToUse > epsilon;

  const kerf = settings.bladeKerf;

  const verticalCut: CutJobStep = {
    cutDirection: CutDirection.VERTICAL,
    cutPosition: widthToUse,
    panelIdToCut: parentPanel.id,
  };

  const horizontalCut: CutJobStep = {
    cutDirection: CutDirection.HORIZONTAL,
    cutPosition: heightToUse,
    panelIdToCut: parentPanel.id,
  };

  if (needsHorizontalCut && needsVerticalCut) {
    const biggestAreaIfHorizontalFirst = Math.max(
      heightToUse * (parentPanel.width - widthToUse - kerf),
      (parentPanel.height - heightToUse - kerf) * parentPanel.width
    );

    const biggestAreaIfVerticalFirst = Math.max(
      widthToUse * (parentPanel.height - heightToUse - kerf),
      (parentPanel.width - widthToUse - kerf) * parentPanel.height
    );

    const cutLengthIfHorizontalFirst = parentPanel.width + heightToUse;
    const cutLengthIfVerticalFirst = parentPanel.height + widthToUse;

    if (settings.optimizeArea) {
      if (biggestAreaIfHorizontalFirst > biggestAreaIfVerticalFirst) {
        return {
          cuts: [horizontalCut, verticalCut],
          biggestArea: biggestAreaIfHorizontalFirst,
        };
      }

      return {
        cuts: [verticalCut, horizontalCut],
        biggestArea: biggestAreaIfVerticalFirst,
      };
    }

    if (cutLengthIfVerticalFirst > cutLengthIfHorizontalFirst) {
      return {
        cuts: [horizontalCut, verticalCut],
        biggestArea: -cutLengthIfHorizontalFirst,
      };
    }

    return {
      cuts: [verticalCut, horizontalCut],
      biggestArea: -cutLengthIfVerticalFirst,
    };
  }

  // TODO: determine the order here based on biggest single piece

  if (needsVerticalCut) {
    // add the height job = VERTICAL cut

    return { cuts: [verticalCut], biggestArea: Number.MAX_VALUE / 2 };
  }

  if (needsHorizontalCut) {
    // add the height job = HORIZONTAL cut

    return { cuts: [horizontalCut], biggestArea: Number.MAX_VALUE / 2 };
  }

  return { cuts: [], biggestArea: Number.MAX_VALUE };
}

function getPanelWaste(parentPanel: Panel, childPanel: Panel) {
  const { bigDim: parentBig, smallDim: parentSmall } =
    getBigAndSmallSideOfPanel(parentPanel);

  const { bigDim: childBig, smallDim: childSmall } =
    getBigAndSmallSideOfPanel(childPanel);

  // short circuit for exact match

  if (
    childBig === parentBig ||
    childSmall === parentSmall ||
    childBig === parentSmall ||
    childSmall === parentBig
  ) {
    return 1;
  }

  return ((childBig / parentBig) * childSmall) / parentSmall;
}

function comparePanels(panelA: Panel, panelB: Panel) {
  // compare biggest dim against biggest dim

  const { bigDim: aBig, smallDim: aSmall } = getBigAndSmallSideOfPanel(panelA);
  const { bigDim: bBig, smallDim: bSmall } = getBigAndSmallSideOfPanel(panelB);

  // a is bigger
  if (aBig > bBig) {
    return -1;
  }

  // b is bigger
  if (aBig < bBig) {
    return 1;
  }

  // check the smaller dimension

  if (aSmall > bSmall) {
    return -1;
  }

  if (aSmall < bSmall) {
    return 1;
  }

  return 0;
}

function getBigAndSmallSideOfPanel(panelA: Panel) {
  const bigDim = Math.max(panelA.height, panelA.width);
  const smallDim = Math.min(panelA.height, panelA.width);
  return { bigDim, smallDim };
}

function willFirstPanelHoldSecond(
  parentPanel: Panel,
  childPanel: Panel,
  settings: CutJobSetting
) {
  // it will fit if the biggest dimension is bigger or equal and smaller is also bigger or equal

  const { bigDim: parentBig, smallDim: parentSmall } =
    getBigAndSmallSideOfPanel(parentPanel);
  const { bigDim: childBig, smallDim: childSmall } =
    getBigAndSmallSideOfPanel(childPanel);

  return parentBig >= childBig && parentSmall >= childSmall;
}

export function convertCsvToJob(input: string) {
  nextId = 1;
  // read the input into lines

  const lines = input.split("\n");

  const job: CutJob = {
    availablePanels: [],
    neededPanels: [],
    settings: { bladeKerf: 0.25, optimizeArea: false },
  };

  let isFirst = true;

  for (let line of lines) {
    if (isFirst) {
      isFirst = false;
      continue;
    }

    if (line.trim() === "") {
      continue;
    }

    const parts = line.split(",");

    /**
     * 
Length,Width,Quantity,Material,Label,Inventory
20 in,16 in,6,0.5 in,Side L,
17.375 in,16 in,3,0.5 in,False Front,
48 in,96 in,3,0.5 in,1/2 PLY,True
     */

    // force height and width to only be numbers
    let height = +parts[0].replaceAll(numOnlyRegex, "");
    let width = +parts[1].replaceAll(numOnlyRegex, "");
    const qty = +parts[2];
    const material = parts[3];
    const label = parts[4];
    const inventory = parts[5].trim().toLowerCase() === "true";

    // force width to be bigger
    if (height > width) {
      [height, width] = [width, height];
    }

    for (let i = 1; i <= qty; i++) {
      const labelToUse = qty > 1 ? label + "-" + i : label;
      const newPanel: Panel = {
        height,
        width,
        id: nextId++,
        material,
        label: labelToUse,
      };

      if (inventory) {
        job.availablePanels.push(newPanel);
      } else {
        job.neededPanels.push(newPanel);
      }
    }
  }

  return job;
}

const numOnlyRegex = /[^0-9.]/g;
