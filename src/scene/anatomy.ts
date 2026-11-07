import type { OrganId } from '../data/clinical';
/** Camera bounds are refined at runtime using meshes from the single registered 3D body. */
export type FocusPose={anchor?:[number,number,number];target:[number,number,number];position:[number,number,number];fov:number};
export const FOCUS:Record<OrganId,FocusPose>={
  body: {target:[0,1.57,0],position:[.18,1.65,6.7],fov:37},
  lungs:{target:[0,2.17,.07],position:[.12,2.22,2.85],fov:34},
  heart:{target:[-.10,2.09,.22],position:[-.45,2.12,1.72],fov:32},
  brain:{target:[0,2.91,0],position:[.15,2.97,1.62],fov:35},
  spine:{target:[0,1.93,-.10],position:[1.2,2.10,-2.55],fov:35},
};
