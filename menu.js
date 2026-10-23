const simpleItems = rows => rows.map(([name, price, image, description]) => ({ name, price, image: image || '', description: description || `${name}.` }));
const sizeItems = (rows, _imageFolder, labels, suffixes) => rows.map(([name, first, second, image]) => ({ name, image: image || '', description: `${name}.`, options: [{ name: `${name} (${suffixes[0]})`, label: labels[0], price: first }, { name: `${name} (${suffixes[1]})`, label: labels[1], price: second }] }));

const MENU_DATA = {
  burgers: { title: 'BURGERS', subtitle: 'CRISPY. JUICY. LOADED.', items: simpleItems([
    ['Classic Crunchy Burger',80,'images/burgers/classic-crunchy-burger.png'],['Classic Chicken Burger',90,'images/burgers/classic-chicken-burger.png'],['Cheesy Crunchy Burger',110,'images/burgers/cheesy-crunchy-burger.png'],['Hot Korean Crunchy Burger',120,'images/burgers/hot-korean-crunchy-burger.png'],['Classic Chicken Cheese Burger',120,'images/burgers/classic-chicken-cheese-burger.png'],['BBQ Chicken Cheese Burger',120,'images/burgers/bbq-chicken-cheese-burger.png'],['CH Crunchy King Burger',150,'images/burgers/ch-crunchy-king-burger.png'],['Double Patty Chicken Burger',160,'images/burgers/double-patty-chicken-burger.png'],['CH Crunchy King Burger With Cheese',190,'images/burgers/ch-crunchy-king-burger-with-cheese.png'],['Chicken Double Patty Cheese',200,'images/burgers/chicken-double-patty-cheese.png']
  ], 'images/burgers') },
  shawarma: { title: 'SHAWARMA', subtitle: 'CHICKEN SHAWARMA. BIG FLAVOUR.', items: simpleItems([
    ['Classic Chicken Shawarma',90],['Peri Peri Chicken Shawarma',110],['Hot Spicy Chicken Shawarma',120],['Tandoori Chicken Shawarma',120],['Chipotle Chicken Shawarma',120],['Cheese Chicken Shawarma',130]
  ]) },
  wraps: { title: 'CHICKEN WRAPS', subtitle: 'CRISPY CHICKEN WRAPPED WITH FLAVOUR.', items: simpleItems([
    ['Regular Chicken Wrap',80,'images/wraps/regular-chicken-wrap.png'],['Crunchy Chicken Wrap',110,'images/wraps/crunchy-chicken-wrap.png'],['Cheese Crunchy Chicken Wrap',120,'images/wraps/cheese-chicken-wrap.png'],['Tandoori Chicken Wrap',130,'images/wraps/tandoori-chicken-wrap.png']
  ], 'images/wraps') },
  bowls: { title: 'LOADED BOWLS', subtitle: 'LOADED WITH FLAVOUR.', items: simpleItems([
    ['Spicy Chipotle BBQ Bowl',140,'images/bowls/spicy-chipotle-bbq-bowl.png'],['Desi Schezwan Tandoori Bowl',110,'images/bowls/desi-schezwan-tandoori-bowl.png'],['Cheesy Chicken Bowl',130,'images/bowls/cheesy-chicken-bowl.png']
  ], 'images/bowls') },
  strips: { title: 'STRIPS', subtitle: 'CRISPY CHICKEN STRIPS.', items: sizeItems([
    ['Classic Regular Strips',90,140,'images/strips/classic-regular-strips.png'],['Peri Peri Strips',100,160,'images/strips/peri-peri-strips.png'],['Cheese Dust Strips',110,180,'images/strips/cheese-dust-strips.png'],['Nachos Cheesy Strips',120,200,'images/strips/nachos-cheesy-strips.png']
  ], 'images/strips', ['3 PCS','5 PCS'], ['3 PCS','5 PCS']) },
  wings: { title: 'HOT WINGS', subtitle: 'CRISPY WINGS. BOLD FLAVOURS.', items: sizeItems([
    ['Classic Regular Wings',120,170,'images/wings/classic-regular-wings.png'],['Peri Peri Wings',140,190,'images/wings/peri-peri-wings.png'],['Cheesy Wings',160,210,'images/wings/cheesy-wings.png'],['Hot Korean Wings',160,210,'images/wings/hot-korean-wings.png']
  ], 'images/wings', ['4 PCS','6 PCS'], ['4 PCS','6 PCS']) },
  popcorn: { title: 'CHICKEN POPCORN', subtitle: 'CRISPY CHICKEN BITES.', items: sizeItems([
    ['Crunchy Chicken Popcorn',110,190,'images/popcorn/crunchy-chicken-popcorn.png'],['Peri Peri Chicken Popcorn',120,210,'images/popcorn/peri-peri-chicken-popcorn.png'],['Cheese Dust Chicken Popcorn',120,210,'images/popcorn/cheese-dust-chicken-popcorn.png'],['Nachos Cheesy Popcorn',150,280,'images/popcorn/nachos-cheesy-popcorn.png']
  ], 'images/popcorn', ['MEDIUM','LARGE'], ['MEDIUM','LARGE']) },
  'signature-fries': { title: 'SIGNATURE FRIES', subtitle: 'LOADED FRIES. BIG FLAVOUR.', items: simpleItems([
    ['Mayo Fries',80,'images/signature-fries/mayo-fries.png'],['Melted Cheese Fries',90,'images/signature-fries/melted-cheese-fries.png'],['Chili Cheese Fries',100,'images/signature-fries/chili-cheese-fries.png'],['BBQ Ranch Fries',100,'images/signature-fries/bbq-ranch-fries.png']
  ], 'images/signature-fries') },
  'french-fries': { title: 'FRENCH FRIES', subtitle: 'GOLDEN. CRISPY. PERFECT.', items: sizeItems([
    ['Classic Salted Fries',70,120,'images/french-fries/classic-salted-fries.png'],['Peri Peri Seasoning Fries',80,140,'images/french-fries/peri-peri-seasoning-fries.png'],['Cheese Dust Fries',80,140,'images/french-fries/cheese-dust-fries.png']
  ], 'images/french-fries', ['HALF','FULL'], ['HALF','FULL']) },
  extras: { title: 'EXTRAS & DIPS', subtitle: 'MAKE IT EXTRA.', items: simpleItems([
    ['Mayo',20,'images/extras/mayo.png'],['Schezwan',20,'images/extras/schezwan.png'],['Chipotle Dip',30,'images/extras/chipotle-dip.png'],['Garlic Dip',30,'images/extras/garlic-dip.png'],['Tandoori Dip',30,'images/extras/tandoori-dip.png'],['Melted Cheese',30,'images/extras/melted-cheese.png'],['Peri Peri Seasoning',20,'images/extras/peri-peri-seasoning.png'],['Cheese Dust Seasoning',30,'images/extras/cheese-dust-seasoning.png']
  ], 'images/extras') }
};

const COMBO_MENU_DATA = [
 {name:'Craving Mega Platter',price:800,value:970,image:'',items:['CH Crunchy King Burger','Hot Korean Crunchy Burger','Cheese Dust Strips (5 pcs)','Peri Peri Wings (6 pcs)','Cheese Dust Chicken Popcorn (Large)','Classic Salted Fries (Full)']},
 {name:'Ultimate Mixed Feast',price:750,value:910,image:'',items:['Spicy Chipotle BBQ Bowl','Cheese Chicken Shawarma','Peri Peri Strips (5 pcs)','Classic Regular Wings (6 pcs)','Crunchy Chicken Popcorn (Large)','Classic Salted Fries (Full)']},
 {name:'Party Combo',price:500,value:550,image:'',items:['2 Classic Crunchy Burgers','2 Regular Chicken Wraps','Crunchy Chicken Popcorn (Medium)','Classic Salted Fries (Full)']},
 {name:'King’s Chicken Feast',price:380,value:430,image:'',items:['CH Crunchy King Burger','Peri Peri Wings (4 pcs)','Cheese Dust Fries (Full)']},
 {name:'Schezwan Crunch Bowl',price:360,value:420,image:'',items:['Desi Schezwan Tandoori Bowl','Nachos Cheesy Strips (5 pcs)','Crunchy Chicken Popcorn (Medium)']},
 {name:'Korean Burger Wing Box',price:280,value:320,image:'',items:['Hot Korean Crunchy Burger','Classic Regular Wings (4 pcs)','Peri Peri Seasoning Fries (Half)']},
 {name:'Shawarma Crunch Box',price:260,value:300,image:'',items:['Classic Chicken Shawarma','Classic Regular Strips (5 pcs)','Classic Salted Fries (Half)']},
 {name:'Duo Combo',price:250,value:300,image:'images/combos/duo-combo.png',items:['2 Classic Crunchy Burgers','Classic Salted Fries (Full)','2 Cold Drinks (₹10 each)']},
 {name:'Loaded King Combo',price:210,value:260,image:'images/combos/loaded-king-combo.png',items:['Spicy Chipotle BBQ Bowl','Crunchy Chicken Popcorn (Medium)','Cold Drink (₹10)']},
 {name:'Ultimate Chicken Feast',price:200,value:250,image:'images/combos/ultimate-chicken-feast.png',items:['Classic Crunchy Burger','Classic Regular Strips (3 pcs)','Classic Salted Fries (Half)','Cold Drink (₹10)']},
 {name:'Wrap Box',price:150,value:190,image:'images/combos/wrap-box.png',items:['Crunchy Chicken Wrap','Classic Salted Fries (Half)','Cold Drink (₹10)']},
 {name:'Burger Box',price:130,value:160,image:'images/combos/burger-box.png',items:['Classic Crunchy Burger','Classic Salted Fries (Half)','Cold Drink (₹10)']}
];
if (typeof window !== "undefined") {
  window.MENU_DATA = MENU_DATA;
  window.COMBO_MENU_DATA = COMBO_MENU_DATA;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MENU_DATA, COMBO_MENU_DATA };
}
