export interface NodeInfo {
  id: string;
  data: any;
}

export interface Connection {
  source: string;
  target: string;
  socket: string;
}

/** actual graph nodes */
const VALID_NODE_TYPES = new Set<string>([
  "animAnimNode_AddIkRequest",
  "animAnimNode_AdditionalFloatTrack",
  "animAnimNode_AdditionalTransform",
  "animAnimNode_AddSnapToTerrainIkRequest",
  "animAnimNode_AimConstraint",
  "animAnimNode_AimConstraint_ObjectRotationUp",
  "animAnimNode_AimConstraint_ObjectUp",
  "animAnimNode_AnimDatabase",
  "animAnimNode_AnimSetTagValue",
  "animAnimNode_AnimSlot",
  "animAnimNode_ApplyCorrectivePoseRBF",
  "animAnimNode_Base",
  "animAnimNode_BaseSwitch",
  "animAnimNode_Blend2",
  "animAnimNode_BlendAdditive",
  "animAnimNode_BlendByMaskDynamic",
  "animAnimNode_BlendFromPose",
  "animAnimNode_BlendMultiple",
  "animAnimNode_BlendOverride",
  "animAnimNode_BlendSpace",
  "animAnimNode_BlendSpace_InternalsBlendSpace",
  "animAnimNode_BlendSpace_InternalsBlendSpaceCoordinateDescription",
  "animAnimNode_BlendSpace_InternalsBlendSpacePoint",
  "animAnimNode_BoolConstant",
  "animAnimNode_BoolInput",
  "animAnimNode_BoolJoin",
  "animAnimNode_BoolLatch",
  "animAnimNode_BoolToFloatConverter",
  "animAnimNode_BoolValue",
  "animAnimNode_BoolVariable",
  "animAnimNode_ConditionalSegmentBegin",
  "animAnimNode_ConditionalSegmentEnd",
  "animAnimNode_ConeLimit",
  "animAnimNode_Container",
  "animAnimNode_CoordinateFromVector",
  "animAnimNode_CriticalSpringDamp",
  "animAnimNode_CurveFloatValue",
  "animAnimNode_CurvePathSlot",
  "animAnimNode_CurveVectorValue",
  "animAnimNode_DampFloat",
  "animAnimNode_DampQuaternion",
  "animAnimNode_DampVector",
  "animAnimNode_Dangle",
  "animAnimNode_DirectConnConstraint",
  "animAnimNode_DirectionToEuler",
  "animAnimNode_DisableLunaticMode",
  "animAnimNode_DisableSleepMode",
  "animAnimNode_Drag",
  "animAnimNode_EnumSwitch",
  "animAnimNode_Event",
  "animAnimNode_EventValue",
  "animAnimNode_ExplorationAdjuster",
  "animAnimNode_EyesLookAt",
  "animAnimNode_EyesReset",
  "animAnimNode_EyesTracksLookAt",
  "animAnimNode_FacialMixerSlot",
  "animAnimNode_FacialSharedMetaPose",
  "animAnimNode_FloatClamp",
  "animAnimNode_FloatComparator",
  "animAnimNode_FloatConstant",
  "animAnimNode_FloatCumulative",
  "animAnimNode_FloatInput",
  "animAnimNode_FloatInterpolation",
  "animAnimNode_FloatJoin",
  "animAnimNode_FloatLatch",
  "animAnimNode_FloatMathOp",
  "animAnimNode_FloatRandom",
  "animAnimNode_FloatTimeDependentSinus",
  "animAnimNode_FloatToBoolConverter",
  "animAnimNode_FloatToIntConverter",
  "animAnimNode_FloatTrackDirectConnConstraint",
  "animAnimNode_FloatTrackModifier",
  "animAnimNode_FloatTrackModifierMarkUnstable",
  "animAnimNode_FloatValue",
  "animAnimNode_FloatValueDebugProvider",
  "animAnimNode_FloatVariable",
  "animAnimNode_FloorIk",
  "animAnimNode_FloorIkBase",
  "animAnimNode_FootStepAdjuster",
  "animAnimNode_FootStepScaling",
  "animAnimNode_ForegroundSegmentBegin",
  "animAnimNode_ForegroundSegmentEnd",
  "animAnimNode_FPPCamera",
  "animAnimNode_FPPCameraSharedVar",
  "animAnimNode_FrozenFrame",
  "animAnimNode_GenerateIkAnimFeatureData",
  "animAnimNode_GraphSlot",
  "animAnimNode_GraphSlot_Test",
  "animAnimNode_GraphSlotConditions",
  "animAnimNode_GraphSlotInput",
  "animAnimNode_HumanIk",
  "animAnimNode_IdentityPoseTerminator",
  "animAnimNode_Ik2",
  "animAnimNode_Ik2Constraint",
  "animAnimNode_Inertialization",
  "animAnimNode_InputSwitch",
  "animAnimNode_IntConstant",
  "animAnimNode_IntInput",
  "animAnimNode_IntJoin",
  "animAnimNode_IntLatch",
  "animAnimNode_IntToFloatConverter",
  "animAnimNode_IntValue",
  "animAnimNode_IntVariable",
  "animAnimNode_Join",
  "animAnimNode_LocomotionAdjuster",
  "animAnimNode_LocomotionAdjusterOnEvent",
  "animAnimNode_LocomotionMachine",
  "animAnimNode_LocomotionSwitch",
  "animAnimNode_LocoState",
  "animAnimNode_LODBegin",
  "animAnimNode_LODEnd",
  "animAnimNode_LookAt",
  "animAnimNode_LookAtApplyVehicleRestrictions",
  "animAnimNode_LookAtController",
  "animAnimNode_LookAtPose360",
  "animAnimNode_LookAtPose360Direction",
  "animAnimNode_MaskReset",
  "animAnimNode_MathExpressionFloat",
  "animAnimNode_MathExpressionPose",
  "animAnimNode_MathExpressionQuaternion",
  "animAnimNode_MathExpressionVector",
  "animAnimNode_MixerSlot",
  "animAnimNode_MotionAdjuster",
  "animAnimNode_MotionTableSwitch",
  "animAnimNode_MultiBoolToFloatValue",
  "animAnimNode_MultipleParentConstraint",
  "animAnimNode_MultipleParentConstraint_ParentInfo",
  "animAnimNode_NameHashConstant",
  "animAnimNode_NPCExploration",
  "animAnimNode_OnePoseInput",
  "animAnimNode_OrientConstraint",
  "animAnimNode_OrientConstraint_WeightedTransform",
  "animAnimNode_Output",
  "animAnimNode_ParentConstraint",
  "animAnimNode_ParentTransform",
  "animAnimNode_PointConstraint",
  "animAnimNode_PointConstraint_WeightedTransform",
  "animAnimNode_Pose360",
  "animAnimNode_PoseCorrection",
  "animAnimNode_PoseLsToMs",
  "animAnimNode_PoseMsToLs",
  "animAnimNode_PostProcess_Footlock",
  "animAnimNode_QuaternionConstant",
  "animAnimNode_QuaternionInput",
  "animAnimNode_QuaternionInterpolation",
  "animAnimNode_QuaternionJoin",
  "animAnimNode_QuaternionLatch",
  "animAnimNode_QuaternionValue",
  "animAnimNode_QuaternionVariable",
  "animAnimNode_QuaternionWsToMs",
  "animAnimNode_RagdollControl",
  "animAnimNode_RagdollPose",
  "animAnimNode_ReadIkRequest",
  "animAnimNode_ReferencePoseTerminator",
  "animAnimNode_Retarget",
  "animAnimNode_Root",
  "animAnimNode_RotateBone",
  "animAnimNode_RotateBoneByQuaternion",
  "animAnimNode_RotationLimit",
  "animAnimNode_RuntimeSwitch",
  "animAnimNode_SelectiveJoin",
  "animAnimNode_Sermo",
  "animAnimNode_SetBoneOrientation",
  "animAnimNode_SetBonePosition",
  "animAnimNode_SetBoneTransform",
  "animAnimNode_SetDrivenKey",
  "animAnimNode_SetDrivenKey_InternalsEntry",
  "animAnimNode_SetDrivenKey_InternalsISetDrivenKeyEntryProvider",
  "animAnimNode_SetDrivenKey_InternalsSetDrivenKeyEntryProviderInline",
  "animAnimNode_SetRequiredDistanceCategory",
  "animAnimNode_SetRequiredDistanceCategoryByBone",
  "animAnimNode_SetTrackRange",
  "animAnimNode_SharedMetaPose",
  "animAnimNode_SharedMetaPoseAdditive",
  "animAnimNode_Signal",
  "animAnimNode_SimpleBounce",
  "animAnimNode_SimpleSpline",
  "animAnimNode_SkAnim",
  "animAnimNode_SkAnimAdjuster",
  "animAnimNode_SkAnimContinue",
  "animAnimNode_SkAnimDecorator",
  "animAnimNode_SkAnimSlot",
  "animAnimNode_SkDurationAnim",
  "animAnimNode_SkFrameAnim",
  "animAnimNode_SkFrameAnimByTrack",
  "animAnimNode_SkipConsoleBegin",
  "animAnimNode_SkipConsoleEnd",
  "animAnimNode_SkipPerformanceModeBegin",
  "animAnimNode_SkipPerformanceModeEnd",
  "animAnimNode_SkOneShotAnim",
  "animAnimNode_SkPhaseAnim",
  "animAnimNode_SkPhaseSlotWithDurationAnim",
  "animAnimNode_SkPhaseWithDurationAnim",
  "animAnimNode_SkPhaseWithSpeedAnim",
  "animAnimNode_SkSpeedAnim",
  "animAnimNode_SkSyncedMasterAnim",
  "animAnimNode_SkSyncedMasterAnimByTime",
  "animAnimNode_SkSyncedSlaveAnim",
  "animAnimNode_SpringDamp",
  "animAnimNode_StackTracksExtender",
  "animAnimNode_StackTracksShrinker",
  "animAnimNode_StackTransformsExtender",
  "animAnimNode_StackTransformsShrinker",
  "animAnimNode_Stage",
  "animAnimNode_StageFloatEntry",
  "animAnimNode_StagePoseEntry",
  "animAnimNode_State",
  "animAnimNode_StateFrozen",
  "animAnimNode_StateMachine",
  "animAnimNode_StaticSwitch",
  "animAnimNode_SuspensionLimit",
  "animAnimNode_Switch",
  "animAnimNode_TagSwitch",
  "animAnimNode_TagValue",
  "animAnimNode_Timer",
  "animAnimNode_TrackSetter",
  "animAnimNode_TrajectoryFromMetaPose",
  "animAnimNode_TransformConstant",
  "animAnimNode_TransformInterpolation",
  "animAnimNode_TransformJoin",
  "animAnimNode_TransformLatch",
  "animAnimNode_TransformRotator",
  "animAnimNode_TransformToTrack",
  "animAnimNode_TransformValue",
  "animAnimNode_TransformVariable",
  "animAnimNode_TranslateBone",
  "animAnimNode_TranslationLimit",
  "animAnimNode_TriggerBranch",
  "animAnimNode_TwistConstraint",
  "animAnimNode_ValueBySpeed",
  "animAnimNode_VectorConstant",
  "animAnimNode_VectorInput",
  "animAnimNode_VectorInterpolation",
  "animAnimNode_VectorJoin",
  "animAnimNode_VectorLatch",
  "animAnimNode_VectorValue",
  "animAnimNode_VectorVariable",
  "animAnimNode_VectorWsToMs",
  "animAnimNode_WorkspotAnim",
  "animAnimNode_WorkspotHub",
  "animAnimNode_WrapperValue"
]);

/** Link types that define connections between nodes */
const VALID_LINK_TYPES = new Set<string>([
  "animFloatLink",
  "animVectorLink",
  "animQuaternionLink",
  "animPoseLink",
  "array:animPoseLink",
  "animIntLink",
  "array:animFloatLink",
  "array:workWorkEntryId",
  "array:animIntLink",
  "animBoolLink",
  "animTransformLink",
]);

export function extractAllNodesAndConnections(nodesToInit: any[]): {
  nodeRegistry: Map<string, any>;
  nodeDataMap: Map<string, any>;
  connections: Connection[];
} {
  const nodeRegistry = new Map<string, any>();
  const nodeDataMap = new Map<string, any>();
  const connections: Connection[] = [];
  const visited = new Set<string>();

  const visitObject = (obj: any, parentId?: string, socket?: string) => {
    if (!obj || typeof obj !== "object") return;

    // Node detection
    if (obj.HandleId && obj.Data?.$type && VALID_NODE_TYPES.has(obj.Data.$type)) {
      const id = obj.HandleId;
      if (!visited.has(id)) {
        visited.add(id);
        nodeRegistry.set(id, obj.Data);
        nodeDataMap.set(id, obj.Data);
      }
      if (parentId && socket) {
        connections.push({ source: id, target: parentId, socket });
      }
      // Recurse into the nodes data, only create valid link types
      Object.entries(obj.Data).forEach(([key, value]) => {
        if (value && typeof value === "object" && VALID_LINK_TYPES.has(value.$type)) {
          // This property defines a link to other nodes
          if (value.node) traverse(value.node, id, key);
          if (Array.isArray(value)) {
            value.forEach((v, idx) => traverse(v, id, `${key}[${idx}]`));
          }
        } else {
          // Normal property, just traverse for child nodes
          traverse(value, id, key);
        }
      });
    } else {
      // Not a node, keep scanning
      if (Array.isArray(obj)) {
        obj.forEach((item, idx) => traverse(item, parentId, `${socket || ""}[${idx}]`));
      } else {
        Object.entries(obj).forEach(([key, value]) => {
          traverse(value, parentId, key);
        });
      }
    }
  };

  const traverse = (value: any, parentId?: string, socket?: string) => {
    if (Array.isArray(value)) {
      value.forEach((item, idx) => traverse(item, parentId, `${socket || ""}[${idx}]`));
    } else if (typeof value === "object" && value !== null) {
      visitObject(value, parentId, socket);
    }
  };

  // Begin traversal from the root node - always the first item in nodesToInit
  if (nodesToInit?.[0]?.Data) {
    traverse(nodesToInit[0].Data);
  }

  return { nodeRegistry, nodeDataMap, connections };
}

export function extractAllNodes(nodesToInit: any[]) {
  const { nodeRegistry, nodeDataMap } = extractAllNodesAndConnections(nodesToInit);
  return { nodeRegistry, nodeDataMap };
}

export function extractAllConnections(nodeRegistry: Map<string, any>) {
  console.warn("Use extractAllNodesAndConnections() to retrieve both nodes and connections.");
  return { connections: [], connectionValues: {} };
}

// Color mapping for different node types
export const COLOR_MAP: Record<string, string> = {
  Root: "#e74c3c",
  Output: "#e67e22",
  SkAnim: "#3498db",
  MixerSlot: "#9b59b6",
  SharedMetaPose: "#1abc9c",
  FacialSharedMetaPose: "#16a085",
  FacialMixerSlot: "#8e44ad",
  ReferencePoseTerminator: "#95a5a6",
  IdentityPoseTerminator: "#7f8c8d",
  StateMachine: "#f39c12",
  State: "#f1c40f",
  BlendFromPose: "#2ecc71",
  BlendAdditive: "#27ae60",
  BlendOverride: "#2980b9",
  FloatConstant: "#e74c3c",
  FloatInput: "#c0392b",
  FloatRandom: "#d35400",
  BoolConstant: "#8e44ad",
  BoolInput: "#9b59b6",
  BoolToFloatConverter: "#a569bd",
  IntConstant: "#d35400",
  Blend2: "#27ae60",
  Switch: "#34495e",
  GraphSlot: "#2c3e50",
  Default: "#7f8c8d",
};

export const getColor = (nodeType: string): string =>
  COLOR_MAP[nodeType] || COLOR_MAP["Default"];
