import _ from "lodash";
import {
  CutDirection,
  CutJob,
  CutJobResults,
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
      .filter((c) => willFirstPanelHoldSecond(c, panelToPlace));

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

    console.log(
      "testing panel",
      panelToPlace,
      bestHoldingPanel,
      panelsToHoldIt
    );

    // remove the known panel since it's going to be split
    _.remove(panelInventory, (c) => c.id === bestHoldingPanel.id);

    // choose best direction on that panel
    // create job steps for each of the cuts needed (may only be one)
    const bestCuts = getBestCut(bestHoldingPanel, panelToPlace);

    if (bestCuts.length === 0) {
      // new panel is perfect size -- no cuts needed
      panelsMade.push(bestHoldingPanel);
      continue;
    }

    const cut1 = bestCuts[0];

    const { goodPanel, wastePanel } = getNewPanelsFromCut(
      bestHoldingPanel,
      cut1
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
      const {
        goodPanel: finalPanel,
        wastePanel: wastePanel2,
      } = getNewPanelsFromCut(goodPanel, cut2);

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
  cut: CutJobStep | undefined
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
    wastePanel.height -= cut.cutPosition;
    wastePanel.parentSourcePos = { top: cut.cutPosition, left: 0 };

    goodPanel.height = cut.cutPosition;
  } else {
    wastePanel.width -= cut.cutPosition;
    wastePanel.parentSourcePos = { top: 0, left: cut.cutPosition };

    goodPanel.width = cut.cutPosition;
  }

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

function getBestCut(parentPanel: Panel, childPanel: Panel): CutJobStep[] {
  // test if the piece should be rotated -- will do the calc twice

  const wasteHeight = parentPanel.height - childPanel.height;
  const wasteWidth = parentPanel.width - childPanel.width;

  const wasteHeightRot = parentPanel.height - childPanel.width;
  const wasteWidthRot = parentPanel.width - childPanel.height;

  // we know it has to fit one way -- if either measure if negative, assume the other

  const wasteNormal =
    wasteHeight < 0 || wasteWidth < 0
      ? Number.MAX_VALUE
      : wasteHeight + wasteWidth;

  const wasteRot =
    wasteHeightRot < 0 || wasteWidthRot < 0
      ? Number.MAX_VALUE
      : wasteHeightRot + wasteWidthRot;

  const cutResults: CutJobStep[] = [];

  // first cut is for the height

  const isRotated = wasteRot < wasteNormal;

  const heightToUse = isRotated ? childPanel.width : childPanel.height;
  const widthToUse = isRotated ? childPanel.height : childPanel.width;

  const epsilon = 0.001;

  if (parentPanel.width - widthToUse > epsilon) {
    // add the height job = VERTICAL cut

    cutResults.push({
      cutDirection: CutDirection.VERTICAL,
      cutPosition: widthToUse,
      panelIdToCut: parentPanel.id,
    });
  }

  if (parentPanel.height - heightToUse > epsilon) {
    // add the height job = HORIZONTAL cut

    const horizontalCut = {
      cutDirection: CutDirection.HORIZONTAL,
      cutPosition: heightToUse,
      panelIdToCut: parentPanel.id,
    };

    if (parentPanel.height > parentPanel.width) {
      cutResults.unshift(horizontalCut);
    } else {
      cutResults.push(horizontalCut);
    }
  }

  return cutResults;

  // next cut is for the width
}

function getPanelWaste(parentPanel: Panel, childPanel: Panel) {
  const {
    bigDim: parentBig,
    smallDim: parentSmall,
  } = getBigAndSmallSideOfPanel(parentPanel);

  const { bigDim: childBig, smallDim: childSmall } = getBigAndSmallSideOfPanel(
    childPanel
  );

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

function willFirstPanelHoldSecond(parentPanel: Panel, childPanel: Panel) {
  // it will fit if the biggest dimension is bigger or equal and smaller is also bigger or equal

  const {
    bigDim: parentBig,
    smallDim: parentSmall,
  } = getBigAndSmallSideOfPanel(parentPanel);
  const { bigDim: childBig, smallDim: childSmall } = getBigAndSmallSideOfPanel(
    childPanel
  );

  return parentBig >= childBig && parentSmall >= childSmall;
}

export function convertCsvToJob(input: string) {
  // read the input into lines

  const lines = input.split("\n");

  const job: CutJob = {
    availablePanels: [],
    neededPanels: [],
    settings: { bladeKerf: 0.25 },
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
