type AtlasNode={parent:AtlasNode|null;userData:Record<string,unknown>;name:string};
/** GLTF primitive children inherit the nearest original atlas-node identity. */
export function atlasOwner<T extends AtlasNode>(object:T):AtlasNode{
 for(let node:AtlasNode|null=object;node;node=node.parent)if(typeof node.userData.za_name==='string'&&node.userData.za_name.trim())return node;
 return object;
}
