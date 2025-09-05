const moduleMap = {
  MagneticButton: () => import("../../MagneticButton/model"),
  MouseFollower: () => import("../../MouseFollower/model"),
  LayeredSections: () => import("../../LayeredSections/model")
};

export default moduleMap;
