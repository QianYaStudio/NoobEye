const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function constrainCamera(view,width,height,ratio){
 const viewHeight=view.size*ratio;
 return {...view,x:view.size>=width?(width-view.size)/2:clamp(view.x,0,width-view.size),y:viewHeight>=height?(height-viewHeight)/2:clamp(view.y,0,height-viewHeight)};
}
export function detailCamera(width,height,ratio){const size=Math.min(width,height/ratio);return constrainCamera({x:(width-size)/2,y:(height-size*ratio)/2,size},width,height,ratio);}
export function overviewCamera(width,height,ratio){return constrainCamera({x:0,y:0,size:Math.max(width,height/ratio)},width,height,ratio);}
export function pointInScene(clientX,clientY,rect,view,ratio){return {x:view.x+(clientX-rect.left)/rect.width*view.size,y:view.y+(clientY-rect.top)/rect.height*view.size*ratio};}
