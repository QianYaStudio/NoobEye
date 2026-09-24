import {titlesJa,introsJa,nounsJa,copyJa} from './ja.js?v=issue-019-20260925';
const KEY='noobeye:language';
let saved;try{saved=localStorage.getItem(KEY);}catch{}
const preferred=(navigator.languages?.[0]||navigator.language||'en').toLowerCase();
export let language=['zh','en','ja'].includes(saved)?saved:(preferred.startsWith('zh')?'zh':preferred.startsWith('ja')?'ja':'en');
export const tr=(zh,en,ja)=>language==='zh'?zh:language==='ja'?(ja??en):en;
export const titleOf=issue=>tr(issue.title,issue.english.replace(/^THE /,'').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()),titlesJa[issue.id]);
const nouns={
  '爪印':'Paw print','直尺':'Ruler','棒棒糖':'Lollipop','海马':'Seahorse','注射器':'Syringe','花生':'Peanut','宝剑':'Sword','刮刀':'Squeegee','橄榄球':'Football',
  '柑橘切片':'Citrus wedge','鸭子':'Duck','打蛋器':'Whisk','铁砧':'Anvil','滚筒刷':'Paint roller','耳朵':'Ear','螺钉':'Screw','纽扣':'Button','三角旗':'Pennant',
'钳子':'Pliers','擀面杖':'Rolling pin','拼图块':'Jigsaw piece','竖琴':'Harp','挂锁':'Padlock','帐篷':'Tent','订书机':'Stapler','胶带卷':'Adhesive tape','印章':'Rubber stamp',
'剃须刀':'Safety razor','包子':'Steamed bun','火柴':'Matchstick','拉链':'Zipper','国际象棋马':'Chess knight','望远镜':'Telescope','滑板':'Skateboard','安抚奶嘴':'Pacifier','虾':'Shrimp',
'平底锅':'Frying pan','多米诺骨牌':'Domino','头戴式耳机':'Headphones','领带':'Necktie','顶针':'Thimble','扫帚':'Broom','音叉':'Tuning fork','漏斗':'Funnel','蜂蜜棒':'Honey dipper',
'扳手':'Wrench','糖果':'Candy','番茄':'Tomato','磁铁':'Magnet','安全别针':'Safety pin','螺旋开瓶器':'Corkscrew','热气球':'Hot-air balloon','棒球棒':'Baseball bat','贝壳':'Seashell',
 '爱心':'Heart','城堡':'Castle','手电筒':'Flashlight','温度计':'Thermometer','樱桃':'Cherries','班卓琴':'Banjo',
 '手铲':'Trowel','手锯':'Hand saw','牛角面包':'Croissant','话筒':'Microphone',
 '手表':'Watch','蜡烛':'Candle','梯子':'Ladder','扇子':'Fan','弹弓':'Slingshot','画笔':'Paintbrush','铃铛':'Bell','信封':'Envelope','龙蛋':'Dragon egg','叉子':'Fork','国际象棋兵':'Chess pawn','相机':'Camera','鲸鱼':'Whale','蝙蝠':'Bat','纸飞机':'Paper airplane','瓶子':'Bottle','烟雾':'Smoke','钥匙':'Key','耙子':'Rake','砍刀':'Machete','葫芦':'Gourd','铁罐':'Tin can','手杖':'Cane','书本':'Book','小猫':'Kitten','冰淇淋':'Ice cream','山竹':'Mangosteen','萝卜':'Carrot','小刀':'Knife','羽毛':'Feather','香蕉':'Banana','手枪':'Pistol','钢笔':'Fountain pen','玩偶':'Doll','山形画框':'Mountain picture','元宝':'Gold ingot','痒痒挠':'Back scratcher','牛奶':'Milk carton','乌龟':'Turtle','晴天娃娃':'Weather doll','花簪':'Flower hairpin','橡果':'Acorn','衬衫':'Shirt','风筝':'Kite','量角器':'Protractor','灯泡':'Light bulb','哨子':'Whistle','帆船':'Sailboat','火箭':'Rocket','牙刷':'Toothbrush','羽毛扇':'Feather fan','梳子':'Comb','曲棍球杆':'Hockey stick','猫':'Cat','冰棒':'Ice pop','圆框眼镜':'Round glasses','美工刀':'Utility knife','腕表':'Wristwatch','桃子':'Peach','吐司':'Toast','蝴蝶':'Butterfly','勺子':'Spoon','调色盘':'Palette','雨伞':'Umbrella','蜗牛':'Snail','鱼':'Fish','骨头':'Bone','剪刀':'Scissors','口琴':'Harmonica','胡萝卜':'Carrot','锯子':'Saw','松果':'Pine cone','牙齿':'Tooth','路锥':'Traffic cone','蘑菇':'Mushroom','领结':'Bow tie','麦克风':'Microphone','沙漏':'Hourglass','熨斗':'Iron','小铲子':'Trowel','园艺铲':'Trowel','铲子':'Trowel','钻石':'Diamond','牛角包':'Croissant','高脚杯':'Goblet','线轴':'Thread spool','回形针':'Paperclip','八分音符':'Eighth note','袜子':'Sock','海星':'Starfish','电源插头':'Electric plug','创可贴':'Bandage','螺丝刀':'Screwdriver','回旋镖':'Boomerang','号角':'Horn','梨':'Pear','手风琴':'Accordion','放大镜':'Magnifying glass','木槌':'Mallet'
};
export const labelOf=target=>tr(target.label,nouns[target.label]||target.labelEn||target.label,nounsJa[target.label]);
const intros={
  '019':'The wind lifts the picnic cloth toward the trees as three people hold the table steady and a dog watches a napkin caught in the branches. Find nine hidden shapes among the cloth, branches and grass.',
  '018':'Beaver keeps the river mill turning as water rushes beneath the wooden wheel. Nine hidden shapes are tucked among the tools, timbers and riverbank.',
'017':'A lion settles in for a trim beneath the trees while the rabbit barber and a tiny helper keep busy. Find nine hidden shapes among the mane, cape and tools.',
'016':'Hippo hangs a giant sheet, a little bird brings clothespins, and a frog carries the laundry. Find nine hidden shapes among the fabric, branches and riverside.',
'015':'A traveler hurries to catch the mountain cable car with a tall plant, while the station keeper holds the door. Find nine hidden shapes among the treetops, cabins and highland platform.',
'014':'Bear stirs the jam, Fox brings fruit, and Dormouse sneaks a taste. Look among the jars, cloths and paving stones for nine hidden shapes.',
'013':'Cloth tails flutter as the children mend their big kite. Follow the tools, wooden frames and grass to find nine little secrets.',
'001':'Sunlight reaches the vegetable beds and the little secrets between the leaves. Take your eyes for a gentle walk through the garden.',
'002':'Sea breezes pass the windows and waves reach the shore. The lighthouse watches the distance; six little things are hiding nearby.',
'003':'Follow the mountain path to a small forest station. Ten familiar shapes are waiting among wood, leaves and stone.',
'004':'Between sand, stone walls and palm leaves, time has left more than one kind of shape. Follow the archaeologists and find nine hidden objects.',
'005':'The lanterns are lit and the alley comes alive. Nine shapes are tucked into sleeves, hairstyles, rooftops and market stalls.',
'006':'Climb the stone steps before the stars appear. A telescope, pine trees and a backpack hold nine surprises for attentive eyes.',
'007':'An elevated road curves through a sunlit city. Eight objects borrow the outlines of trees, buildings and cars. Look again to find them.',
'008':'Letters bring stories from far away while the river passes a quiet doorway. Find nine little secrets as you wait for a reply.',
'009':'One enormous pumpkin turns autumn into a tiny world. Follow its curves, gaps and leaves to uncover nine hidden gifts.',
'010':'The film has not started, but night has arrived. Explore the rooftop and find eight surprises in its unexpected outlines.',
'011':'Clay turns between the potters’ hands as afternoon light falls on the paving. Nine objects have changed direction or become part of something else.',
'012':'Pages turn softly as the library drifts downstream. Join the otter’s journey and add nine discoveries to today’s reading.'};
export const introOf=issue=>tr(issue.intro,intros[issue.id],introsJa[issue.id]);
export function clueOf(target,issue){
 const b=target.bounds,x=(b[0]+b[2])/2/issue.width,y=(b[1]+b[3])/2/issue.height;
 return tr(`看看画面${y<1/3?'上方':y<2/3?'中部':'下方'}${x<1/3?'偏左':x>2/3?'偏右':''}，试着转动脑海里的形状。`,`Look in the ${y<1/3?'upper':y<2/3?'middle':'lower'} ${x<1/3?'left':x>2/3?'right':'center'} of the picture. Try rotating the shape in your mind.`,`画面の${y<1/3?'上の方':y<2/3?'中央あたり':'下の方'}${x<1/3?'、左寄り':x>2/3?'、右寄り':''}を見てみましょう。頭の中で形を回してみてください。`);
}
const copy={
creationNote:["本项目 99% 的素材、创意实现、艺术创作和代码均由 Codex 完成。", "Codex created 99% of this project’s assets, creative execution, artwork, and code."],
clearRecords:['清除记录','Clear records'],clearTitle:['清除游玩记录','Clear play records'],clearDescription:['清除当前浏览器中的进度、提示、计时和个人最佳。语言、声音设置及在线累计统计保留。','Clear progress, hints, time and personal bests saved in this browser. Language, sound settings and online totals stay.'],clearCurrent:['清除本期','Clear this issue'],clearAll:['清除全部期数','Clear every issue'],clearCancel:['取消','Cancel'],
skip:['跳到找物游戏','Skip to the game'],mast:['FindPuzzle · 独立找物杂志','FindPuzzle · A hidden-object journal'],archiveLink:['往期书架','The collection'],coverKicker:['换个眼光，看见日常','THE ART OF NOTICING'],coverDescription:['放慢一点，让目光在画里散个步。每一页，都有值得停留的小世界。','Slow down. Take your eyes for a walk. There is a small world worth noticing on every page.'],enter:['开始寻找 · 含音乐','Start exploring · with music'],closer:['再靠近一点。','LOOK A LITTLE CLOSER.'],ticket:['好奇心入场券','CURIOSITY PASS'],ticker:['有些惊喜，要再看一眼。　·　让好奇心，有处可去。　·　有些惊喜，要再看一眼。','LESS SCROLLING, MORE SEEING.　·　A LITTLE CURIOSITY GOES A LONG WAY.　·　LOOK AGAIN.'],editor:['编者的话','EDITOR’S NOTE'],editorTitle:['熟悉的地方，藏着另一种形状。','Familiar places. Unfamiliar shapes.'],collection:['往期书架','THE COLLECTION'],collectionTitle:['挑一个世界，进去走走。','Pick a world. Step inside.'],swipe:['左右滑动，挑选一期','Swipe to choose an issue'],prev:['上一期','Previous issue'],next:['下一期','Next issue'],shelf:['返回书架','Back to the collection'],found:['已发现','FOUND'],time:['观察时间','TIME EXPLORING'],track:['选曲','Track'],defaultTrack:['默认 · Echoes','Default · Echoes'],volume:['音量','Volume'],color:['彩色','Color'],line:['线稿','Line art'],fit:['全景','Fit'],canvasTip:['点击发现 · 放大细看 · 拖动探索','Tap to find · Zoom in · Drag to explore'],gestures:['滚轮 / 双指缩放，拖动查看细节。键盘：＋ − 缩放，方向键移动，H 提示。','Scroll / pinch to zoom. Drag to explore. Keyboard: + − to zoom, arrows to move, H for a hint.'],findTitle:['寻找清单','FIND THESE'],findIntro:['记住形状，不必拘泥于方向。点选一件藏品，再获取提示。','Remember the shape, not its direction. Select an object if you would like a hint.'],autoSave:['进度自动保存','Progress saved automatically'],restart:['重新寻找','Start again'],finished:['全部发现','EVERY LITTLE THING, FOUND.'],completeTitle:['原来，你都看见了。','You saw it all.'],share:['复制本期链接','Copy issue link'],footerLine:['让好奇心，有处可去。','A home for your curiosity.'],footerNote:['一本可以玩的独立找物杂志','An independent journal you can play'],credits:['授权与署名','Credits & licenses'],resetTitle:['重新寻找这一期？','Explore this issue again?'],resetCopy:['本期进度与本次计时会清空，个人最佳成绩保留。','This attempt’s progress and timer will reset. Your personal best stays.'],cancel:['继续当前进度','Keep exploring'],confirm:['重新开始','Start again'],loading:['画面加载中…','Loading the picture…'],pause:['已暂停','Paused']
};
function renderTicker(){
 const ticker=document.querySelector('.ticker');if(!ticker)return;
 const phrases=tr(...copy.ticker,copyJa.ticker).split('·').map(s=>s.trim()).filter(Boolean);
 const track=document.createElement('div');track.className='ticker-track';
 for(let repeat=0;repeat<2;repeat++){
  const group=document.createElement('div');group.className='ticker-group';
  for(const phrase of phrases){const item=document.createElement('span');item.className='ticker-item';const text=document.createElement('span');text.textContent=phrase;item.append(text);group.append(item);}
  track.append(group);
 }
 ticker.replaceChildren(track);
}
export function applyLanguage(){
 document.documentElement.lang=language==='zh'?'zh-CN':language;
 renderTicker();
 document.title=tr('NoobEye · FindPuzzle — 找物解谜','NoobEye · FindPuzzle — A hidden-object journal','NoobEye · FindPuzzle — もの探しマガジン');
 document.querySelectorAll('[data-i18n]').forEach(el=>{const pair=copy[el.dataset.i18n];if(pair)el.textContent=tr(...pair,copyJa[el.dataset.i18n]);});
 const headline=document.getElementById('cover-title');if(headline)headline.innerHTML=tr('日常，<br>另有<span class="outlined">发现。</span>','Look again.<br><span class="outlined">Find wonder.</span>','いつもの景色に、<br><span class="outlined">新しい発見。</span>');
 const toggle=document.getElementById('language-toggle');if(toggle){toggle.value=language;toggle.setAttribute('aria-label',tr('语言','Language','言語'));}
 const vp=document.getElementById('viewport');if(vp){vp.dataset.loading=tr(...copy.loading,copyJa.loading);vp.setAttribute('aria-label',tr('点击藏品，拖动画面移动，加减键缩放，H 获取提示。','Click hidden objects. Drag to pan, + and − to zoom, H for a hint.','隠れたものをクリック。ドラッグで移動、＋と−で拡大縮小、Hでヒント。'));}
 for(const[id,zh,en,ja]of[['zoom-in','放大','Zoom in','拡大'],['zoom-out','缩小','Zoom out','縮小'],['music-volume','背景音乐音量','Music volume','音楽の音量']])document.getElementById(id)?.setAttribute('aria-label',tr(zh,en,ja));
}
export function setupLanguage(){
 const control=document.getElementById('language-toggle');if(control)control.innerHTML='<option value="zh">中文</option><option value="en">English</option><option value="ja">日本語</option>';
 applyLanguage();control?.addEventListener('change',e=>{if(!['zh','en','ja'].includes(e.target.value))return;language=e.target.value;try{localStorage.setItem(KEY,language);}catch{}applyLanguage();window.dispatchEvent(new Event('noobeye-language'));});
}
