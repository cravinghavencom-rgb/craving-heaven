(() => {
  const STORAGE_KEY = "chCustomerLanguageV2";
  const languages = {
    hinglish: {
      "DELIVER TO": "DELIVERY YAHAN",
      "Choose your location": "Apni location chunein",
      "Tap to set delivery address": "Delivery address set karne ke liye tap karein",
      "CRAVING POINTS": "CRAVING POINTS",
      "Sign in": "Login karein",
      "YOUR DELIVERY LOCATION": "AAPKI DELIVERY LOCATION",
      "Where should we deliver?": "Delivery kahan karni hai?",
      "Saved addresses": "Saved addresses",
      "+ Add address": "+ Address add karein",
      "OR CHOOSE YOUR DELIVERY AREA": "YA APNA DELIVERY AREA CHUNEIN",
      "Choose your area": "Apna area chunein",
      "ADDRESS LABEL": "ADDRESS LABEL",
      "CONTACT NAME": "CONTACT NAME",
      "FULL ADDRESS": "POORA ADDRESS",
      "LANDMARK": "LANDMARK",
      "OPTIONAL": "OPTIONAL",
      "DELIVERY AREA": "DELIVERY AREA",
      "Select your area": "Apna area select karein",
      "Set as default address": "Isse default address banayein",
      "CANCEL": "CANCEL",
      "SAVE ADDRESS": "ADDRESS SAVE KAREIN",
      "Your account": "Aapka account",
      "Profile": "Profile",
      "Manage your account and discover member rewards.": "Apna account manage karein aur member rewards dekhein.",
      "LANGUAGE": "BHASHA",
      "Choose your language": "Apni bhasha chunein",
      "Your choice is saved on this device.": "Aapki choice is device par save rahegi.",
      "WEBSITE LANGUAGE": "WEBSITE KI BHASHA",
      "Website language": "Website ki bhasha",
      "Saved Addresses": "Saved Addresses",
      "LOGIN TO ADD ADDRESS": "ADDRESS ADD KARNE KE LIYE LOGIN KAREIN",
      "YOUR CRAVING HEAVEN": "AAPKA CRAVING HEAVEN",
      "Your Orders": "Aapke Orders",
      "Track your recent orders and see what you enjoyed.": "Apne recent orders aur pasandida items yahan dekhein.",
      "REFRESH": "REFRESH",
      "MEMBER BENEFITS": "MEMBER BENEFITS",
      "Craving Points & Rewards": "Craving Points aur Rewards",
      "Earn points as you order and unlock tasty treats.": "Order karein, points kamaayein aur tasty treats unlock karein.",
      "Craving Points": "Craving Points",
      "Earn points as you order and use them for savings on eligible food.": "Har order par points kamaayein aur eligible food par bachat karein.",
      "CRAVING POINTS BALANCE": "CRAVING POINTS BALANCE",
      "How it works": "Kaise kaam karta hai",
      "Earn": "Kamaayein",
      "Redeem": "Redeem karein",
      "Keep": "Sambhaal kar rakhein",
      "Your Craving Points don’t expire.": "Aapke Craving Points expire nahi hote.",
      "YOUR ORDER JOURNEY": "AAPKA ORDER JOURNEY",
      "Your next rewards": "Aapke agle rewards",
      "Every completed order brings your next treat closer. Free food rewards are valid for 7 days.": "Har completed order aapko agle treat ke kareeb laata hai. Free food rewards 7 din tak valid hain.",
      "Sign in to track": "Track karne ke liye login karein",
      "Account unavailable": "Account abhi available nahi hai",
      "Loading account…": "Account load ho raha hai…",
      "Sign in to see your Craving Points and next rewards.": "Craving Points aur agle rewards dekhne ke liye login karein.",
      "Sign in to see your next rewards.": "Apne agle rewards dekhne ke liye login karein.",
      "Your next reward lineup is being updated.": "Aapke agle rewards update ho rahe hain.",
      "upcoming rewards": "upcoming rewards",
      "Each one unlocks after its order is completed.": "Har reward order complete hone par unlock hoga.",
      "READY TO USE": "USE KARNE KE LIYE READY",
      "USE IN CART": "CART MEIN USE KAREIN",
      "FIRST ONLINE ORDER GIFT": "FIRST ONLINE ORDER GIFT",
      "VIEW MENU": "MENU DEKHEIN",
      "YOUR ORDER": "AAPKA ORDER",
      "YOUR CART": "AAPKA CART",
      "CLEAR CART": "CART KHAALI KAREIN",
      "PLACE ORDER": "ORDER PLACE KAREIN",
      "CONTINUE TO CHECKOUT": "CHECKOUT PAR JAAYEIN",
      "Login with your mobile number to continue with your order.": "Order continue karne ke liye mobile number se login karein.",
      "YOUR CRAVING POINTS": "AAPKE CRAVING POINTS",
      "Sign in to view": "Dekhne ke liye login karein",
      "Checking sign-in…": "Login check ho raha hai…",
      "Temporarily unavailable": "Filhaal available nahi",
      "Your next craving reward": "Aapka agla Craving reward",
      "completed order": "completed order",
      "completed orders": "completed orders",
      "orders to unlock": "orders mein unlock hoga",
      "order to unlock": "order mein unlock hoga",
      "Locked": "Locked",
      "Unlocks when the required order is completed and delivered or picked up.": "Required order deliver ya pickup complete hone ke baad unlock hoga.",
      "Add any regular menu item to your first online order. The burger appears in your cart at ₹0; combos or extras alone do not qualify.": "Apne first online order mein koi regular menu item add karein. Burger cart mein ₹0 par dikhega; sirf combo ya extras se offer nahi milega.",
      "Combo value counts toward this reward’s minimum spend.": "Is reward ke minimum spend mein combo ki value count hoti hai.",
      "Combo value does not count toward this reward’s minimum spend.": "Is reward ke minimum spend mein combo ki value count nahi hoti.",
      "Use this reward on your next order": "Is reward ko apne agle order par use karein",
      "A reward for a future completed order.": "Aane wale completed order par reward milega.",
      "Log in to save delivery addresses.": "Delivery addresses save karne ke liye login karein.",
      "No saved addresses yet. Add one to make checkout quicker.": "Abhi koi saved address nahi hai. Checkout jaldi karne ke liye address add karein.",
      "Your account is ready.": "Aapka account ready hai.",
      "Sign in to view your profile.": "Profile dekhne ke liye login karein.",
      "LOG IN": "LOGIN KAREIN",
      "LOGIN": "LOGIN KAREIN",
      "LOG OUT": "LOG OUT",
      "LOGGED IN AS": "LOGIN HAI",
      "DEFAULT": "MUKHYA",
      "EDIT": "BADLEIN",
      "DELETE": "HATAAYEIN",
      "ORDER PLACED!": "ORDER CONFIRM HO GAYA!",
      "ORDER ID": "ORDER ID",
      "Thank you for ordering with us. Your order has been received successfully.": "Thank you! Aapka order successfully place ho gaya hai.",
      "Track your order anytime from the Orders screen.": "Apne order ko Orders page par kabhi bhi track karein.",
      "See my next reward": "APNA AGLA REWARD DEKHEIN",
      "A little something for your first order": "Aapke first order ke liye ek chhota sa treat",
      "DELIVERY DETAILS": "DELIVERY DETAILS",
      "Enter your details to place your order.": "Order place karne ke liye apni details bharein.",
      "HOW WOULD YOU LIKE TO GET YOUR ORDER?": "Aap apna order kaise lena chahenge?",
      "Delivery": "GHAR TAK DELIVERY",
      "Bring it to your address": "Aapke address par pahunchayenge",
      "Pickup": "Pickup",
      "Collect from our store": "Store se collect karein",
      "YOUR NAME": "AAPKA NAAM",
      "USE A SAVED ADDRESS": "SAVED ADDRESS USE KAREIN",
      "Enter a new address": "Naya address daalein",
      "SAVE THIS ADDRESS AS": "ADDRESS KO IS NAAM SE SAVE KAREIN",
      "Choose a label": "Label chunein",
      "We’ll save this address to your account for your next order.": "Ye address aapke agle order ke liye account mein save hoga.",
      "DELIVERY ADDRESS": "DELIVERY ADDRESS",
      "Nearby landmark": "Paas ka landmark",
      "AREA": "AREA",
      "PAYMENT METHOD": "PAYMENT METHOD",
      "PAY ON DELIVERY": "DELIVERY PAR PAYMENT KAREIN",
      "Cash / UPI on delivery": "Delivery par Cash / UPI",
      "ORDER SUMMARY": "ORDER SUMMARY",
      "Your order has been received successfully.": "Aapka order successfully receive ho gaya hai.",
      "Aaj aapko mila hai": "Aaj aapko mila hai",
      "What are you craving?": "Aaj kya khane ka mann hai?",
      "Browse the menu or choose a value-packed combo.": "Menu dekhein ya value-packed combo chunein.",
      "BROWSE MENU": "MENU DEKHEIN",
      "SEE COMBOS": "COMBOS DEKHEIN",
      "Start with the menu": "Menu se shuru karein",
      "Choose a food category or browse every item.": "Food category chunein ya saare items dekhein.",
      "Burgers": "Burgers",
      "Shawarma": "Shawarma",
      "Wings": "Wings",
      "Fries": "Fries",
      "Full menu": "Poora menu",
      "VIEW COMPLETE MENU": "POORA MENU DEKHEIN",
      "Combo favourites": "Pasandida combos",
      "Great-value meals and sharing boxes.": "Behtareen value wale meals aur sharing boxes.",
      "Rewards and fun": "Rewards aur fun",
      "VIEW REWARDS": "REWARDS DEKHEIN",
      "Never Miss a CRAVING HEAVEN Offer!": "CRAVING HEAVEN ka offer miss na karein!",
      "Get notified about new offers, discounts & special deals.": "Naye offers, discounts aur special deals ki notification paayein.",
      "GET OFFERS": "OFFERS PAAYEIN",
      "COMING SOON": "JALD AA RAHA HAI",
      "A new Craving Heaven game is in the works. Check back here soon.": "Craving Heaven ka naya game ban raha hai. Jaldi wapas aayein.",
      "Pick your favourites": "Apne favourites chunein",
      "Choose a category or search for a dish.": "Category chunein ya dish search karein.",
      "COMBO MENU": "COMBOS KA MENU",
      "MENU VALUE": "MENU KI KEEMAT",
      "YOU SAVE": "AAPKI BACCHAT",
      "COMBO PRICE": "COMBO KI KEEMAT",
      "TOTAL PAID": "KUL BILL",
      "ITEM": "ITEM",
      "ITEMS": "ITEMS",
      "FREE": "FREE",
      "DELIVERED": "DELIVER HO GAYA",
      "CANCELLED": "CANCEL HO GAYA",
      "NEW": "NAYA",
      "RECEIVED": "MILA",
      "PREPARING": "TAIYAAR HO RAHA HAI",
      "STORE PICKUP": "STORE SE PICKUP",
      "READY TO USE": "USE KARNE KE LIYE READY",
      "LOCKED": "LOCK HAI",
      "UP NEXT": "AGLA REWARD",
      "ADD KAREIN +": "ADD KAREIN +",
      "CART MEIN ADD KAREIN": "CART MEIN ADD KAREIN",
      "COMBO CART MEIN ADD KAREIN": "COMBO CART MEIN ADD KAREIN",
      "BACK HOME": "HOME PAR JAAYEIN",
      "Ready when you are": "Aap jab ready hon, game shuru karein",
      "The game is offline right now. Come back soon for a fresh run.": "Game abhi available nahi hai. Nayi run ke liye jaldi wapas aayein.",
      "STORE HOURS": "STORE KA TIME",
      "CHECKING": "CHECK HO RAHA HAI",
      "OPEN NOW": "ABHI KHULA HAI",
      "BUSY RIGHT NOW": "ABHI BUSY HAIN",
      "CLOSED": "BAND",
      "ADDRESS": "PATA",
      "DELIVERY AREAS": "DELIVERY WALE ILAAQE",
      "MADE WITH QUALITY, SERVED WITH LOVE!": "QUALITY KE SAATH BANA, PYAAR SE SERVE KIYA!",
      "CHICKEN WRAPS": "CHICKEN WRAPS",
      "LOADED BOWLS": "BHARPOOR BOWLS",
      "STRIPS": "CHICKEN STRIPS",
      "HOT WINGS": "HOT WINGS",
      "CHICKEN POPCORN": "CHICKEN POPCORN",
      "SIGNATURE FRIES": "SIGNATURE FRIES",
      "FRENCH FRIES": "FRENCH FRIES",
      "EXTRAS & DIPS": "EXTRAS AUR DIPS",
      "BAND": "BAND",
      "STORE HOURS": "STORE KA TIME",
      "TOTAL PAID": "KUL BILL",
      "TEST TOTAL · NO PAYMENT DUE": "TEST ORDER · PAYMENT NAHI",
      "FREE": "FREE",
      "USE IN CART": "CART MEIN USE KAREIN",
      "FIRST ONLINE ORDER GIFT": "FIRST ORDER KA GIFT",
      "UP NEXT · ORDER": "AGLA REWARD · ORDER",
      "ORDER": "ORDER",
      "ITEMS": "ITEMS",
      "SAVE": "BACHAT",
      "MENU VALUE": "MENU KI KEEMAT",
      "YOU SAVE": "AAPKI BACCHAT",
      "COMBO PRICE": "COMBO KI KEEMAT",
      "Home": "Home",
      "Default": "DEFAULT",
      "Menu": "MENU",
      "Combos": "COMBOS",
      "MY ORDERS": "MERE ORDERS",
      "Rewards": "INAAM",
      "Orders": "MERE ORDERS",
      "Profile": "ACCOUNT",
      "Burgers": "BURGERS",
      "Shawarma": "SHAWARMA",
      "Wraps": "WRAPS",
      "Bowls": "BOWLS",
      "Strips": "STRIPS",
      "Hot Wings": "HOT WINGS",
      "Chicken Popcorn": "CHICKEN POPCORN",
      "Signature Fries": "SIGNATURE FRIES",
      "French Fries": "FRENCH FRIES",
      "Extras & Dips": "EXTRAS AUR DIPS",
      "CHICKEN WRAPS": "CHICKEN WRAPS",
      "LOADED BOWLS": "LOADED BOWLS",
      "HOT WINGS": "HOT WINGS",
      "CHICKEN POPCORN": "CHICKEN POPCORN",
      "SIGNATURE FRIES": "SIGNATURE FRIES",
      "FRENCH FRIES": "FRENCH FRIES",
      "EXTRAS & DIPS": "EXTRAS AUR DIPS",
      "STORE HOURS": "STORE KA TIME",
      "CHECKING": "CHECK HO RAHA HAI",
      "OPEN NOW": "ABHI KHULA HAI",
      "BUSY RIGHT NOW": "ABHI BUSY HAIN",
      "PREPARING": "TAIYAARI JAARI HAI",
      "LOGGED IN AS": "LOGIN HAI",
      "EDIT": "BADLEIN",
      "DELETE": "HATAAYEIN",
      "USE BY": "ISTEMAL KAREIN",
      "STORE PICKUP": "STORE SE PICKUP",
      "MENU VALUE": "MENU KI KEEMAT",
      "YOU SAVE": "AAPKI BACCHAT",
      "COMBO PRICE": "COMBO KI KEEMAT",
      "READY TO USE": "USE KARNE KE LIYE READY",
      "LOCKED": "LOCK HAI",
      "UP NEXT": "AGLA REWARD",
      "BACK HOME": "HOME PAR JAAYEIN",
      "Ready when you are": "Aap jab ready hon, game shuru karein",
      "The game is offline right now. Come back soon for a fresh run.": "Game abhi available nahi hai. Nayi run ke liye jaldi wapas aayein.",
      "COMPLETE MEALS AT A BETTER PRICE.": "Behtar price par complete meals.",
      "Aaj aapko mila hai: {quantity} {item} free!": "Aaj aapko mila hai: {quantity} {item} free!",
      "Yay! Aaj ki delivery free hai!": "Yay! Aaj ki delivery free hai!",
      "Yay! Aapko ₹{amount} ki bachat mili! {title}": "Yay! Aapko ₹{amount} ki bachat mili! {title}",
      "Aapne {points} Craving Points use karke ₹{amount} bachaye!": "Aapne {points} Craving Points use karke ₹{amount} bachaye!",
      "A FIRST-ORDER TREAT FROM CRAVING HEAVEN": "CRAVING HEAVEN se first-order ka treat",
      "Your first order gets a free burger!": "Aapke first order par burger FREE!",
      "Add any regular menu item to your first online order and get a Classic Crunchy Burger free.": "First online order mein koi regular menu item add karein aur Classic Crunchy Burger FREE paayein.",
      "YOUR FIRST-ORDER GIFT": "AAPKA FIRST-ORDER GIFT",
      "FIRST ONLINE ORDER · ONE GIFT PER CUSTOMER": "FIRST ONLINE ORDER · HAR CUSTOMER KO EK GIFT",
      "START YOUR CRAVING HEAVEN ORDER": "CRAVING HEAVEN ORDER SHURU KAREIN",
      "MADE FOR": "BANAYA AAPKE LIYE",
      "YOUR CRAVING": "AAPKI CRAVING",
      "CRISPY.": "CRISPY.",
      "JUICY. HEAVENLY.": "JUICY. HEAVENLY.",
      "01 · THE FULL MENU": "01 · POORA MENU",
      "02 · VALUE COMBOS": "02 · VALUE COMBOS",
      "MORE FROM CRAVING HEAVEN": "CRAVING HEAVEN SE AUR BHI",
      "CRAVING RUN · COMING SOON": "CRAVING RUN · JALD AA RAHA HAI",
      "to see your points.": "apne points dekhein.",
      "A LITTLE MORE HEAVEN IN YOUR INBOX": "AAPKE INBOX MEIN THODA AUR HEAVEN",
      "Be first to hear about tasty offers": "Tasty offers ki khabar sabse pehle paayein",
      "Get a browser notification when new offers arrive and when a reward is ready to use.": "Naye offers aane par aur reward ready hone par browser notification paayein.",
      "NOTIFY ME ABOUT OFFERS": "OFFERS KI NOTIFICATION PAAYEIN",
      "MAYBE LATER": "BAAD MEIN",
      "You can change notification permission any time in your browser settings.": "Browser settings mein notification permission kabhi bhi badal sakte hain.",
      "COMING SOON · CRAVING HEAVEN": "JALD AA RAHA HAI · CRAVING HEAVEN",
      "A new game from Craving Heaven is in the works. Check back here for its launch.": "Craving Heaven ka naya game ban raha hai. Launch ke liye yahan check karte rahein.",
      "A fresh Craving Heaven game is on the way": "Craving Heaven ka naya game aa raha hai",
      "We’re getting Craving Run ready. We’ll share it here when it’s ready to play.": "Craving Run taiyaar ho raha hai. Khelne ke liye ready hote hi yahin batayenge.",
      "BACK TO HOME": "HOME PAR JAAYEIN",
      "MORE FLAVOUR · MORE VALUE": "ZYAADA FLAVOUR · ZYAADA VALUE",
      "Search menu items": "Menu items search karein",
      "Search burgers, wings, fries…": "Burgers, wings, fries search karein…",
      "Clear menu search": "Menu search saaf karein",
      "0 completed orders": "0 completed orders",
      "No orders yet": "Abhi koi order nahi hai",
      "Your order history will show here after your first order.": "Pehla order karne ke baad uski details yahan dikhegi.",
      "EXPLORE MENU": "MENU DEKHEIN",
      "Menu": "Menu",
      "Combos": "Combos",
      "ADD +": "ADD KAREIN +",
      "ADD TO CART": "CART MEIN ADD KAREIN",
      "ADD COMBO TO CART": "COMBO CART MEIN ADD KAREIN",
      "ALL COMBOS": "SAARE COMBOS",
      "FEATURED COMBO": "FEATURED COMBO",
      "IN YOUR CART": "AAPKE CART MEIN",
      "SAVE": "BACHAT",
      "Play": "Khelein",
      "Rewards": "Rewards",
      "Orders": "Orders",
      "CART": "CART",
      "CLOSED": "BAND",
      "LOGIN TO ORDER": "ORDER KE LIYE LOGIN KAREIN",
      "Enter your mobile number to continue.": "Aage badhne ke liye mobile number daalein.",
      "MOBILE NUMBER": "MOBILE NUMBER",
      "Enter mobile number": "Mobile number daalein",
      "Mobile number": "Mobile number",
      "SEND OTP": "OTP BHEJEIN",
      "By continuing, you agree to receive an SMS OTP for verification.": "Aage badhne par verification ke liye SMS OTP aayega.",
      "LOCAL TEST ACCOUNTS · no SMS or OTP": "LOCAL TEST ACCOUNTS · SMS ya OTP nahi",
      "Only works on this local emulator. Test orders stay separate from live orders.": "Sirf local emulator par chalta hai. Test orders live orders se alag rehte hain.",
      "ENTER OTP": "OTP DAALEIN",
      "Enter 6-digit OTP": "6-digit OTP daalein",
      "OTP": "OTP",
      "VERIFY OTP": "OTP VERIFY KAREIN",
      "RESEND OTP": "OTP DOBARA BHEJEIN",
      "CHANGE MOBILE NUMBER": "MOBILE NUMBER BADLEIN",
      "Pick up your order at CRAVING HEAVEN": "CRAVING HEAVEN se apna order pickup karein",
      "We’ll notify you here when your order is ready. Pay at the store when you collect it.": "Order ready hone par yahin batayenge. Pickup ke waqt store par payment karein.",
      "Enter your name": "Apna naam daalein",
      "Enter your complete delivery address": "Apna poora delivery address daalein",
      "Shop 10, Pearl Oasis Building, Pathanwadi, Malad East, Mumbai – 400097": "Shop 10, Pearl Oasis Building, Pathanwadi, Malad East, Mumbai – 400097",
      "Track your order anytime from the Orders screen.": "Apne order ko Orders page par kabhi bhi track karein.",
      "Thank you for ordering with us. Your order has been received successfully.": "Thank you! Aapka order successfully place ho gaya hai.",
      "Order confirm ho gaya! Aapka reward neeche hai.": "Order confirm ho gaya! Aapka reward neeche hai.",
      "Aapka order successfully place ho gaya hai.": "Aapka order successfully place ho gaya hai.",
      "This is a test order. It will not be prepared or earn rewards.": "Yeh test order hai. Isse prepare nahi kiya jayega aur koi reward nahi milega.",
      "Your new order will count toward the next reward after delivery or pickup.": "Aapka yeh order delivery ya pickup complete hone ke baad agle reward mein count hoga.",
      "This test order will not count toward rewards.": "Yeh test order rewards mein count nahi hoga.",
      "Your delivery address is saved to your account.": "Aapka delivery address account mein save ho gaya hai.",
      "TEST ORDER PLACED": "TEST ORDER PLACE HO GAYA",
      "TEST ORDER ONLY — it is saved separately and will not be prepared, sent to staff, charged, or earn Craving Points.": "SIRF TEST ORDER — yeh alag save hota hai; prepare, staff ko send ya charge nahi hoga, aur Craving Points nahi milenge.",
      "Pickup at Shop 10, Pearl Oasis Building, Pathanwadi, Malad East. Pay at the store and track readiness from Your Orders.": "Pickup: Shop 10, Pearl Oasis Building, Pathanwadi, Malad East. Store par payment karein aur Your Orders mein ready status dekhein."
    },
    hi: {
      "DELIVER TO": "डिलीवरी यहाँ करें",
      "Choose your location": "अपना स्थान चुनें",
      "Tap to set delivery address": "डिलीवरी पता सेट करने के लिए टैप करें",
      "CRAVING POINTS": "क्रेविंग पॉइंट्स",
      "Sign in": "लॉग इन करें",
      "YOUR DELIVERY LOCATION": "आपकी डिलीवरी लोकेशन",
      "Where should we deliver?": "डिलीवरी कहाँ करनी है?",
      "Saved addresses": "सेव किए गए पते",
      "+ Add address": "+ पता जोड़ें",
      "OR CHOOSE YOUR DELIVERY AREA": "या अपना डिलीवरी एरिया चुनें",
      "Choose your area": "अपना एरिया चुनें",
      "ADDRESS LABEL": "पते का नाम",
      "CONTACT NAME": "संपर्क का नाम",
      "FULL ADDRESS": "पूरा पता",
      "LANDMARK": "लैंडमार्क",
      "OPTIONAL": "वैकल्पिक",
      "DELIVERY AREA": "डिलीवरी एरिया",
      "Select your area": "अपना एरिया चुनें",
      "Set as default address": "इसे डिफ़ॉल्ट पता बनाएँ",
      "CANCEL": "रद्द करें",
      "SAVE ADDRESS": "पता सेव करें",
      "Your account": "आपका अकाउंट",
      "Profile": "प्रोफ़ाइल",
      "Manage your account and discover member rewards.": "अपना अकाउंट मैनेज करें और मेंबर रिवॉर्ड देखें।",
      "LANGUAGE": "भाषा",
      "Choose your language": "अपनी भाषा चुनें",
      "Your choice is saved on this device.": "आपकी पसंद इसी डिवाइस पर सेव रहेगी।",
      "WEBSITE LANGUAGE": "वेबसाइट की भाषा",
      "Website language": "वेबसाइट की भाषा",
      "Saved Addresses": "सेव किए गए पते",
      "LOGIN TO ADD ADDRESS": "पता जोड़ने के लिए लॉग इन करें",
      "YOUR CRAVING HEAVEN": "आपका क्रेविंग हेवन",
      "Your Orders": "आपके ऑर्डर",
      "Track your recent orders and see what you enjoyed.": "अपने हाल के ऑर्डर और पसंदीदा आइटम यहाँ देखें।",
      "REFRESH": "रिफ़्रेश करें",
      "MEMBER BENEFITS": "मेंबर फ़ायदे",
      "Craving Points & Rewards": "क्रेविंग पॉइंट्स और रिवॉर्ड",
      "Earn points as you order and unlock tasty treats.": "ऑर्डर पर पॉइंट कमाएँ और स्वादिष्ट ट्रीट अनलॉक करें।",
      "Craving Points": "क्रेविंग पॉइंट्स",
      "Earn points as you order and use them for savings on eligible food.": "हर ऑर्डर पर पॉइंट कमाएँ और योग्य खाने पर बचत करें।",
      "CRAVING POINTS BALANCE": "क्रेविंग पॉइंट्स बैलेंस",
      "How it works": "यह कैसे काम करता है",
      "Earn": "कमाएँ",
      "Redeem": "रिडीम करें",
      "Keep": "सहेजें",
      "Your Craving Points don’t expire.": "आपके क्रेविंग पॉइंट्स एक्सपायर नहीं होते।",
      "YOUR ORDER JOURNEY": "आपकी ऑर्डर यात्रा",
      "Your next rewards": "आपके अगले रिवॉर्ड",
      "Every completed order brings your next treat closer. Free food rewards are valid for 7 days.": "हर पूरा ऑर्डर आपको अगले ट्रीट के करीब लाता है। फ्री फ़ूड रिवॉर्ड 7 दिन तक मान्य हैं।",
      "Sign in to track": "ट्रैक करने के लिए लॉग इन करें",
      "Account unavailable": "अकाउंट अभी उपलब्ध नहीं है",
      "Loading account…": "अकाउंट लोड हो रहा है…",
      "Sign in to see your Craving Points and next rewards.": "क्रेविंग पॉइंट्स और अगले रिवॉर्ड देखने के लिए लॉग इन करें।",
      "Sign in to see your next rewards.": "अपने अगले रिवॉर्ड देखने के लिए लॉग इन करें।",
      "Your next reward lineup is being updated.": "आपके अगले रिवॉर्ड अपडेट हो रहे हैं।",
      "upcoming rewards": "आने वाले रिवॉर्ड",
      "Each one unlocks after its order is completed.": "हर रिवॉर्ड संबंधित ऑर्डर पूरा होने पर अनलॉक होगा।",
      "READY TO USE": "इस्तेमाल के लिए तैयार",
      "USE IN CART": "कार्ट में इस्तेमाल करें",
      "FIRST ONLINE ORDER GIFT": "पहले ऑनलाइन ऑर्डर का तोहफ़ा",
      "VIEW MENU": "मेन्यू देखें",
      "YOUR ORDER": "आपका ऑर्डर",
      "YOUR CART": "आपकी कार्ट",
      "CLEAR CART": "कार्ट खाली करें",
      "PLACE ORDER": "ऑर्डर करें",
      "CONTINUE TO CHECKOUT": "चेकआउट पर जाएँ",
      "Login with your mobile number to continue with your order.": "ऑर्डर जारी रखने के लिए मोबाइल नंबर से लॉग इन करें।",
      "YOUR CRAVING POINTS": "आपके क्रेविंग पॉइंट्स",
      "Sign in to view": "देखने के लिए लॉग इन करें",
      "Checking sign-in…": "लॉग इन जाँचा जा रहा है…",
      "Temporarily unavailable": "अभी उपलब्ध नहीं",
      "Your next craving reward": "आपका अगला क्रेविंग रिवॉर्ड",
      "completed order": "पूरा ऑर्डर",
      "completed orders": "पूरे ऑर्डर",
      "orders to unlock": "ऑर्डर बाद अनलॉक होगा",
      "order to unlock": "ऑर्डर बाद अनलॉक होगा",
      "Locked": "लॉक है",
      "Unlocks when the required order is completed and delivered or picked up.": "ज़रूरी ऑर्डर डिलीवर या पिकअप पूरा होने पर अनलॉक होगा।",
      "Add any regular menu item to your first online order. The burger appears in your cart at ₹0; combos or extras alone do not qualify.": "पहले ऑनलाइन ऑर्डर में कोई रेगुलर मेन्यू आइटम जोड़ें। बर्गर कार्ट में ₹0 पर दिखेगा; सिर्फ़ कॉम्बो या एक्स्ट्रा से ऑफ़र नहीं मिलेगा।",
      "Combo value counts toward this reward’s minimum spend.": "इस रिवॉर्ड के न्यूनतम खर्च में कॉम्बो की कीमत गिनी जाएगी।",
      "Combo value does not count toward this reward’s minimum spend.": "इस रिवॉर्ड के न्यूनतम खर्च में कॉम्बो की कीमत नहीं गिनी जाएगी।",
      "Use this reward on your next order": "इस रिवॉर्ड को अगले ऑर्डर पर इस्तेमाल करें",
      "A reward for a future completed order.": "आने वाले पूरे ऑर्डर पर रिवॉर्ड मिलेगा।",
      "Log in to save delivery addresses.": "डिलीवरी पते सेव करने के लिए लॉग इन करें।",
      "No saved addresses yet. Add one to make checkout quicker.": "अभी कोई पता सेव नहीं है। जल्दी चेकआउट के लिए पता जोड़ें।",
      "Your account is ready.": "आपका अकाउंट तैयार है।",
      "Sign in to view your profile.": "प्रोफ़ाइल देखने के लिए लॉग इन करें।",
      "LOG IN": "लॉग इन करें",
      "LOGIN": "लॉग इन करें",
      "LOG OUT": "लॉग आउट",
      "ORDER PLACED!": "ऑर्डर कन्फ़र्म हो गया!",
      "ORDER ID": "ऑर्डर आईडी",
      "Thank you for ordering with us. Your order has been received successfully.": "धन्यवाद! आपका ऑर्डर सफलतापूर्वक प्लेस हो गया है।",
      "Track your order anytime from the Orders screen.": "अपने ऑर्डर को कभी भी ऑर्डर्स पेज पर ट्रैक करें।",
      "See my next reward": "मेरा अगला रिवॉर्ड देखें",
      "A little something for your first order": "आपके पहले ऑर्डर के लिए एक छोटा-सा तोहफ़ा",
      "DELIVERY DETAILS": "डिलीवरी की जानकारी",
      "Enter your details to place your order.": "ऑर्डर करने के लिए अपनी जानकारी भरें।",
      "HOW WOULD YOU LIKE TO GET YOUR ORDER?": "आप अपना ऑर्डर कैसे लेना चाहेंगे?",
      "Delivery": "डिलीवरी",
      "Bring it to your address": "आपके पते पर पहुँचाएँगे",
      "Pickup": "पिकअप",
      "Collect from our store": "स्टोर से लें",
      "YOUR NAME": "आपका नाम",
      "USE A SAVED ADDRESS": "सेव किया पता इस्तेमाल करें",
      "Enter a new address": "नया पता लिखें",
      "SAVE THIS ADDRESS AS": "पते को इस नाम से सेव करें",
      "Choose a label": "नाम चुनें",
      "We’ll save this address to your account for your next order.": "यह पता आपके अगले ऑर्डर के लिए अकाउंट में सेव होगा।",
      "DELIVERY ADDRESS": "डिलीवरी का पता",
      "Nearby landmark": "पास का लैंडमार्क",
      "AREA": "एरिया",
      "PAYMENT METHOD": "पेमेंट का तरीका",
      "PAY ON DELIVERY": "डिलीवरी पर पेमेंट करें",
      "Cash / UPI on delivery": "डिलीवरी पर कैश / UPI",
      "ORDER SUMMARY": "ऑर्डर का सारांश",
      "Your order has been received successfully.": "आपका ऑर्डर सफलतापूर्वक मिल गया है।",
      "Aaj aapko mila hai": "आज आपको मिला है",
      "What are you craving?": "आज क्या खाने का मन है?",
      "Browse the menu or choose a value-packed combo.": "मेन्यू देखें या बढ़िया वैल्यू वाला कॉम्बो चुनें।",
      "BROWSE MENU": "मेन्यू देखें",
      "SEE COMBOS": "कॉम्बो देखें",
      "Start with the menu": "मेन्यू से शुरू करें",
      "Choose a food category or browse every item.": "फ़ूड कैटेगरी चुनें या सभी आइटम देखें।",
      "Burgers": "बर्गर",
      "Shawarma": "शावरमा",
      "Wings": "विंग्स",
      "Fries": "फ्राइज़",
      "Full menu": "पूरा मेन्यू",
      "VIEW COMPLETE MENU": "पूरा मेन्यू देखें",
      "Combo favourites": "पसंदीदा कॉम्बो",
      "Great-value meals and sharing boxes.": "बढ़िया वैल्यू वाले मील और शेयरिंग बॉक्स।",
      "Rewards and fun": "रिवॉर्ड और मज़ा",
      "VIEW REWARDS": "रिवॉर्ड देखें",
      "Never Miss a CRAVING HEAVEN Offer!": "CRAVING HEAVEN का ऑफ़र न चूकें!",
      "Get notified about new offers, discounts & special deals.": "नए ऑफ़र, डिस्काउंट और खास डील की सूचना पाएँ।",
      "GET OFFERS": "ऑफ़र पाएँ",
      "COMING SOON": "जल्द आ रहा है",
      "A new Craving Heaven game is in the works. Check back here soon.": "क्रेविंग हेवन का नया गेम बन रहा है। जल्द वापस आएँ।",
      "Pick your favourites": "अपने पसंदीदा चुनें",
      "Choose a category or search for a dish.": "कैटेगरी चुनें या कोई डिश खोजें।",
      "COMBO MENU": "कॉम्बो मेन्यू",
      "COMPLETE MEALS AT A BETTER PRICE.": "बेहतर कीमत पर पूरा मील।",
      "Aaj aapko mila hai: {quantity} {item} free!": "आज आपको मिला है: {quantity} {item} मुफ़्त!",
      "Yay! Aaj ki delivery free hai!": "वाह! आज की डिलीवरी मुफ़्त है!",
      "Yay! Aapko ₹{amount} ki bachat mili! {title}": "वाह! आपको ₹{amount} की बचत मिली! {title}",
      "Aapne {points} Craving Points use karke ₹{amount} bachaye!": "आपने {points} क्रेविंग पॉइंट्स इस्तेमाल करके ₹{amount} बचाए!",
      "A FIRST-ORDER TREAT FROM CRAVING HEAVEN": "CRAVING HEAVEN की ओर से पहले ऑर्डर का तोहफ़ा",
      "Your first order gets a free burger!": "पहले ऑर्डर पर बर्गर मुफ़्त!",
      "Add any regular menu item to your first online order and get a Classic Crunchy Burger free.": "पहले ऑनलाइन ऑर्डर में कोई रेगुलर मेन्यू आइटम जोड़ें और Classic Crunchy Burger मुफ़्त पाएँ।",
      "YOUR FIRST-ORDER GIFT": "आपका पहले ऑर्डर का तोहफ़ा",
      "FIRST ONLINE ORDER · ONE GIFT PER CUSTOMER": "पहला ऑनलाइन ऑर्डर · हर ग्राहक को एक तोहफ़ा",
      "START YOUR CRAVING HEAVEN ORDER": "अपना क्रेविंग हेवन ऑर्डर शुरू करें",
      "MADE FOR": "आपके लिए बनाया",
      "YOUR CRAVING": "आपकी क्रेविंग",
      "CRISPY.": "कुरकुरा।",
      "JUICY. HEAVENLY.": "ज्यूसी। लाजवाब।",
      "01 · THE FULL MENU": "01 · पूरा मेन्यू",
      "02 · VALUE COMBOS": "02 · वैल्यू कॉम्बो",
      "MORE FROM CRAVING HEAVEN": "क्रेविंग हेवन से और भी",
      "CRAVING RUN · COMING SOON": "क्रेविंग रन · जल्द आ रहा है",
      "to see your points.": "अपने पॉइंट देखने के लिए।",
      "A LITTLE MORE HEAVEN IN YOUR INBOX": "आपके इनबॉक्स में थोड़ा और हेवन",
      "Be first to hear about tasty offers": "स्वादिष्ट ऑफ़र की खबर सबसे पहले पाएँ",
      "Get a browser notification when new offers arrive and when a reward is ready to use.": "नए ऑफ़र आने और रिवॉर्ड तैयार होने पर ब्राउज़र सूचना पाएँ।",
      "NOTIFY ME ABOUT OFFERS": "ऑफ़र की सूचना पाएँ",
      "MAYBE LATER": "बाद में",
      "You can change notification permission any time in your browser settings.": "ब्राउज़र सेटिंग में सूचना की अनुमति कभी भी बदल सकते हैं।",
      "COMING SOON · CRAVING HEAVEN": "जल्द आ रहा है · क्रेविंग हेवन",
      "A new game from Craving Heaven is in the works. Check back here for its launch.": "क्रेविंग हेवन का नया गेम बन रहा है। लॉन्च के लिए यहाँ देखते रहें।",
      "A fresh Craving Heaven game is on the way": "क्रेविंग हेवन का नया गेम आ रहा है",
      "We’re getting Craving Run ready. We’ll share it here when it’s ready to play.": "क्रेविंग रन तैयार हो रहा है। खेलने के लिए तैयार होते ही यहीं बताएँगे।",
      "BACK TO HOME": "होम पर जाएँ",
      "MORE FLAVOUR · MORE VALUE": "ज़्यादा स्वाद · ज़्यादा वैल्यू",
      "Search menu items": "मेन्यू आइटम खोजें",
      "Search burgers, wings, fries…": "बर्गर, विंग्स, फ्राइज़ खोजें…",
      "Clear menu search": "मेन्यू सर्च साफ़ करें",
      "0 completed orders": "0 ऑर्डर पूरे",
      "No orders yet": "अभी कोई ऑर्डर नहीं है",
      "Your order history will show here after your first order.": "पहले ऑर्डर के बाद उसकी जानकारी यहाँ दिखेगी।",
      "EXPLORE MENU": "मेन्यू देखें",
      "Menu": "मेन्यू",
      "MY ORDERS": "मेरे ऑर्डर",
      "Combos": "कॉम्बो",
      "ADD +": "कार्ट में जोड़ें +",
      "ADD TO CART": "कार्ट में जोड़ें",
      "ADD COMBO TO CART": "कॉम्बो कार्ट में जोड़ें",
      "ALL COMBOS": "सभी कॉम्बो",
      "FEATURED COMBO": "खास कॉम्बो",
      "IN YOUR CART": "आपके कार्ट में",
      "SAVE": "बचत",
      "Play": "खेलें",
      "Rewards": "रिवॉर्ड",
      "Orders": "ऑर्डर",
      "CART": "कार्ट",
      "CLOSED": "बंद",
      "LOGIN TO ORDER": "ऑर्डर के लिए लॉग इन करें",
      "Enter your mobile number to continue.": "आगे बढ़ने के लिए मोबाइल नंबर लिखें।",
      "MOBILE NUMBER": "मोबाइल नंबर",
      "Enter mobile number": "मोबाइल नंबर लिखें",
      "Mobile number": "मोबाइल नंबर",
      "SEND OTP": "OTP भेजें",
      "By continuing, you agree to receive an SMS OTP for verification.": "आगे बढ़ने पर वेरिफ़िकेशन के लिए SMS OTP आएगा।",
      "LOCAL TEST ACCOUNTS · no SMS or OTP": "लोकल टेस्ट अकाउंट · SMS या OTP नहीं",
      "Only works on this local emulator. Test orders stay separate from live orders.": "सिर्फ़ लोकल एम्युलेटर पर चलता है। टेस्ट ऑर्डर लाइव ऑर्डर से अलग रहते हैं।",
      "ENTER OTP": "OTP लिखें",
      "Enter 6-digit OTP": "6 अंकों का OTP लिखें",
      "OTP": "OTP",
      "VERIFY OTP": "OTP वेरिफ़ाई करें",
      "RESEND OTP": "OTP दोबारा भेजें",
      "CHANGE MOBILE NUMBER": "मोबाइल नंबर बदलें",
      "Pick up your order at CRAVING HEAVEN": "CRAVING HEAVEN से अपना ऑर्डर पिकअप करें",
      "We’ll notify you here when your order is ready. Pay at the store when you collect it.": "ऑर्डर तैयार होने पर यहीं बताएँगे। पिकअप के समय स्टोर पर पेमेंट करें।",
      "Enter your name": "अपना नाम लिखें",
      "Enter your complete delivery address": "अपना पूरा डिलीवरी पता लिखें",
      "Shop 10, Pearl Oasis Building, Pathanwadi, Malad East, Mumbai – 400097": "Shop 10, Pearl Oasis Building, Pathanwadi, Malad East, Mumbai – 400097",
      "Track your order anytime from the Orders screen.": "अपने ऑर्डर को कभी भी ऑर्डर पेज पर ट्रैक करें।",
      "Thank you for ordering with us. Your order has been received successfully.": "धन्यवाद! आपका ऑर्डर सफलतापूर्वक प्लेस हो गया है।",
      "ADDRESS": "पता",
      "DELIVERY AREAS": "डिलीवरी एरिया",
      "MADE WITH QUALITY, SERVED WITH LOVE!": "क्वालिटी से बनाया, प्यार से परोसा!",
      "CHICKEN WRAPS": "चिकन रैप्स",
      "LOADED BOWLS": "लोडेड बाउल्स",
      "STRIPS": "चिकन स्ट्रिप्स",
      "HOT WINGS": "हॉट विंग्स",
      "CHICKEN POPCORN": "चिकन पॉपकॉर्न",
      "SIGNATURE FRIES": "सिग्नेचर फ्राइज़",
      "FRENCH FRIES": "फ्रेंच फ्राइज़",
      "EXTRAS & DIPS": "एक्स्ट्रा और डिप्स",
      "BAND": "बंद",
      "STORE HOURS": "स्टोर का समय",
      "TOTAL PAID": "कुल भुगतान",
      "TEST TOTAL · NO PAYMENT DUE": "टेस्ट ऑर्डर · पेमेंट नहीं",
      "FREE": "मुफ़्त",
      "USE IN CART": "कार्ट में इस्तेमाल करें",
      "FIRST ONLINE ORDER GIFT": "पहले ऑर्डर का तोहफ़ा",
      "ORDER": "ऑर्डर",
      "ITEMS": "आइटम",
      "SAVE": "बचत",
      "MENU VALUE": "मेन्यू की कीमत",
      "YOU SAVE": "आपकी बचत",
      "COMBO PRICE": "कॉम्बो की कीमत",
      "Home": "Home",
      "Menu": "मेन्यू",
      "Combos": "कॉम्बो",
      "Play": "खेलें",
      "Rewards": "रिवॉर्ड",
      "Orders": "ऑर्डर",
      "Profile": "प्रोफ़ाइल",
      "LOGGED IN AS": "लॉग इन हैं",
      "LOG OUT": "लॉग आउट",
      "DEFAULT": "डिफ़ॉल्ट",
      "EDIT": "बदलें",
      "DELETE": "हटाएँ",
      "STORE HOURS": "स्टोर का समय",
      "CHECKING": "जाँच हो रही है",
      "OPEN NOW": "अभी खुला है",
      "BUSY RIGHT NOW": "अभी व्यस्त हैं",
      "PREPARING": "तैयारी जारी है",
      "DELIVERED": "डिलीवर हो गया",
      "CANCELLED": "रद्द",
      "NEW": "नया",
      "RECEIVED": "मिल गया",
      "STORE PICKUP": "स्टोर से पिकअप",
      "TOTAL PAID": "कुल भुगतान",
      "MENU VALUE": "मेन्यू की कीमत",
      "YOU SAVE": "आपकी बचत",
      "COMBO PRICE": "कॉम्बो की कीमत",
      "LOCKED": "लॉक है",
      "UP NEXT": "अगला रिवॉर्ड",
      "BACK HOME": "होम पर जाएँ",
      "Ready when you are": "जब आप तैयार हों, गेम शुरू करें",
      "The game is offline right now. Come back soon for a fresh run.": "गेम अभी उपलब्ध नहीं है। नई रन के लिए जल्द वापस आएँ।",
      "Order confirm ho gaya! Aapka reward neeche hai.": "ऑर्डर कन्फ़र्म हो गया! आपका रिवॉर्ड नीचे है।",
      "Aapka order successfully place ho gaya hai.": "आपका ऑर्डर सफलतापूर्वक प्लेस हो गया है।",
      "This is a test order. It will not be prepared or earn rewards.": "यह टेस्ट ऑर्डर है। इसे तैयार नहीं किया जाएगा और कोई रिवॉर्ड नहीं मिलेगा।",
      "Your new order will count toward the next reward after delivery or pickup.": "डिलीवरी या पिकअप पूरा होने के बाद यह ऑर्डर अगले रिवॉर्ड में गिना जाएगा।",
      "This test order will not count toward rewards.": "यह टेस्ट ऑर्डर रिवॉर्ड में नहीं गिना जाएगा।",
      "Your delivery address is saved to your account.": "आपका डिलीवरी पता अकाउंट में सेव हो गया है।",
      "TEST ORDER PLACED": "टेस्ट ऑर्डर प्लेस हो गया",
      "TEST ORDER ONLY — it is saved separately and will not be prepared, sent to staff, charged, or earn Craving Points.": "सिर्फ़ टेस्ट ऑर्डर — यह अलग सेव होता है; तैयार नहीं होगा, स्टाफ़ को नहीं भेजा जाएगा, चार्ज नहीं होगा और क्रेविंग पॉइंट्स नहीं मिलेंगे।",
      "Pickup at Shop 10, Pearl Oasis Building, Pathanwadi, Malad East. Pay at the store and track readiness from Your Orders.": "पिकअप: Shop 10, Pearl Oasis Building, Pathanwadi, Malad East। स्टोर पर पेमेंट करें और Your Orders में तैयार होने का स्टेटस देखें।"
    }
  };

  const foldedDictionaries = Object.fromEntries(Object.entries(languages).map(([key, entries]) => [
    key,
    Object.fromEntries(Object.entries(entries).map(([source, translated]) => [source.toLocaleLowerCase(), translated]))
  ]));

  const sourceText = new WeakMap();
  const lastText = new WeakMap();
  const sourceAttributes = new WeakMap();
  const lastAttributes = new WeakMap();
  let language = "en";
  let applying = false;

  const englishOverrides = {
    "Aaj aapko mila hai: {quantity} {item} free!": "You got {quantity} free {item} today!",
    "Yay! Aaj ki delivery free hai!": "Great news! Today’s delivery is free!",
    "Yay! Aapko ₹{amount} ki bachat mili! {title}": "You saved ₹{amount}! {title}",
    "Aapne {points} Craving Points use karke ₹{amount} bachaye!": "You used {points} Craving Points and saved ₹{amount}!",
    "Order confirm ho gaya! Aapka reward neeche hai.": "Your order is confirmed! Your reward is below.",
    "Aapka order successfully place ho gaya hai.": "Your order was placed successfully.",
    "This test order will not count toward rewards.": "This test order will not count toward rewards.",
    "Aaj aapko mila hai": "You received"
  };

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (["hinglish", "en"].includes(saved)) language = saved;
  } catch (_) {}

  const trimParts = value => {
    const text = String(value || "");
    const trimmed = text.trim();
    return { leading: text.slice(0, text.indexOf(trimmed)), core: trimmed, trailing: text.slice(text.indexOf(trimmed) + trimmed.length) };
  };

  function translateCore(value, target = language) {
    const phrase = String(value || "").replace(/\u00a0/g, " ").trim();
    if (!phrase) return phrase;
    if (target === "en") return englishOverrides[phrase] || phrase;
    const dictionary = languages[target] || languages.hinglish;
    const direct = dictionary[phrase] ?? foldedDictionaries[target]?.[phrase.toLocaleLowerCase()];
    if (direct !== undefined) return direct;
    let match = phrase.match(/^(\d+) completed (orders?)$/i);
    if (match) return target === "hi" ? `${match[1]} ऑर्डर पूरे` : `${match[1]} completed orders`;
    match = phrase.match(/^(\d+) (orders?) to unlock$/i);
    if (match) return target === "hi" ? `${match[1]} ऑर्डर में अनलॉक होगा` : `${match[1]} order${match[1] === "1" ? "" : "s"} mein unlock hoga`;
    match = phrase.match(/^(\d+) more completed orders? to unlock(?: · added after delivery or pickup)?$/i);
    if (match) return target === "hi" ? `${match[1]} और पूरे ऑर्डर के बाद अनलॉक होगा` : `${match[1]} aur completed order ke baad unlock hoga`;
    match = phrase.match(/^Locked · (\d+) (orders?) away$/i);
    if (match) return target === "hi" ? `लॉक है · ${match[1]} ऑर्डर बाकी` : `Locked · ${match[1]} order${match[1] === "1" ? "" : "s"} baaki`;
    match = phrase.match(/^(NEXT ROUND · )?ORDER (\d+)$/i);
    if (match) return target === "hi" ? `${match[1] ? "अगला राउंड · " : ""}ऑर्डर ${match[2]}` : `${match[1] ? "AGLA ROUND · " : "ORDER "}${match[2]}`;
    match = phrase.match(/^(\d+) upcoming rewards$/i);
    if (match) return target === "hi" ? `${match[1]} आने वाले रिवॉर्ड` : `${match[1]} upcoming rewards`;
    match = phrase.match(/^(UP NEXT · )?(NEXT ROUND · )?ORDER (\d+)$/i);
    if (match) return target === "hi" ? `${match[1] || match[2] ? "अगला रिवॉर्ड · " : "ऑर्डर "}${match[3]}` : `${match[1] || match[2] ? "AGLA REWARD · " : "ORDER "}${match[3]}`;
    match = phrase.match(/^(\d+) ITEMS?$/i);
    if (match) return target === "hi" ? `${match[1]} आइटम` : `${match[1]} ITEMS`;
    match = phrase.match(/^(\d+) items?$/i);
    if (match) return target === "hi" ? `${match[1]} आइटम` : `${match[1]} items`;
    match = phrase.match(/^(\d+) dishes found$/i);
    if (match) return target === "hi" ? `${match[1]} डिश मिलीं` : `${match[1]} dishes mile`;
    match = phrase.match(/^Opens (today|tomorrow) at (.+)$/i);
    if (match) return target === "hi" ? `${match[1].toLowerCase() === "today" ? "आज" : "कल"} ${match[2]} बजे खुलेगा` : `${match[1].toLowerCase() === "today" ? "Aaj" : "Kal"} ${match[2]} baje khulega`;
    match = phrase.match(/^On ₹([\d,]+) food subtotal · combos count$/i);
    if (match) return target === "hi" ? `₹${match[1]} के खाने के सबटोटल पर · कॉम्बो भी गिने जाएँगे` : `₹${match[1]} food subtotal par · combos bhi count honge`;
    match = phrase.match(/^TEST ORDER ·\s*(.*)$/i);
    if (match) return `${target === "hi" ? "टेस्ट ऑर्डर · " : "TEST ORDER · "}${match[1]}`;
    match = phrase.match(/^Add ₹([\d,]+) more for FREE DELIVERY!?$/i);
    if (match) return target === "hi" ? `मुफ़्त डिलीवरी के लिए ₹${match[1]} और जोड़ें!` : `FREE DELIVERY ke liye ₹${match[1]} aur add karein!`;
    match = phrase.match(/^(Add|Remove one|Decrease|Increase) (.+?)(?: to cart| for ₹([\d,.]+))?$/i);
    if (match) {
      const actions = target === "hi"
        ? { add: "जोड़ें", "remove one": "एक हटाएँ", decrease: "कम करें", increase: "बढ़ाएँ" }
        : { add: "cart mein add karein", "remove one": "ek hataayein", decrease: "kam karein", increase: "badhaayein" };
      const action = actions[match[1].toLowerCase()] || match[1];
      return match[3]
        ? target === "hi" ? `${match[2]} · ₹${match[3]} में ${action}` : `${match[2]} · ₹${match[3]} par ${action}`
        : `${match[2]} ${action}`;
    }
    match = phrase.match(/^(.+?) · FREE$/i);
    if (match) return `${match[1]} · ${target === "hi" ? "मुफ़्त" : "FREE"}`;
    return phrase;
  }

  function getSourceText(node) {
    const current = node.nodeValue || "";
    const last = lastText.get(node);
    if (last !== undefined && current !== last) sourceText.set(node, current);
    if (!sourceText.has(node)) sourceText.set(node, current);
    return sourceText.get(node);
  }

  function shouldSkipText(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    if (parent.closest("script,style,noscript,[data-no-translate],.menu-card h3,.combo-menu-card h3,.home-combo-card h2,.home-saved-address strong,.saved-address-card header strong,.saved-address-card p,.order-history-item-copy strong,.journey-card > strong,.footer-block p")) return true;
    return false;
  }

  function translateTextNode(node) {
    if (!node?.isConnected || shouldSkipText(node)) return;
    const original = getSourceText(node);
    const parts = trimParts(original);
    const translated = `${parts.leading}${translateCore(parts.core)}${parts.trailing}`;
    if (node.nodeValue !== translated) {
      applying = true;
      node.nodeValue = translated;
      lastText.set(node, translated);
      applying = false;
    } else {
      lastText.set(node, translated);
    }
  }

  function translateAttribute(element, name) {
    if (!element?.hasAttribute(name) || element.closest("[data-no-translate]")) return;
    let cache = sourceAttributes.get(element);
    let last = lastAttributes.get(element);
    if (!cache) { cache = {}; sourceAttributes.set(element, cache); }
    if (!last) { last = {}; lastAttributes.set(element, last); }
    const current = element.getAttribute(name) || "";
    if (last[name] !== undefined && current !== last[name]) cache[name] = current;
    if (cache[name] === undefined) cache[name] = current;
    const source = cache[name];
    const parts = trimParts(source);
    const translated = `${parts.leading}${translateCore(parts.core)}${parts.trailing}`;
    if (current !== translated) element.setAttribute(name, translated);
    last[name] = translated;
  }

  function translateRoot(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) translateTextNode(node);
    if (root.nodeType === Node.ELEMENT_NODE) {
      ["placeholder", "aria-label", "title"].forEach(name => translateAttribute(root, name));
    }
    root.querySelectorAll?.("[placeholder],[aria-label],[title]").forEach(element => {
      ["placeholder", "aria-label", "title"].forEach(name => translateAttribute(element, name));
    });
  }

  function applyLanguage(nextLanguage) {
    language = ["hinglish", "en"].includes(nextLanguage) ? nextLanguage : "en";
    try { localStorage.setItem(STORAGE_KEY, language); } catch (_) {}
    document.documentElement.lang = language === "hinglish" ? "hi-Latn" : "en-IN";
    const selector = document.getElementById("customerLanguageSelect");
    if (selector && selector.value !== language) selector.value = language;
    document.querySelectorAll("[data-first-visit-language]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.firstVisitLanguage === language));
    });
    translateRoot();
    window.dispatchEvent(new CustomEvent("customer-language-change", { detail: { language } }));
  }

  function template(source, values = {}) {
    const translated = translateCore(source);
    return translated.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
  }

  function rewardMessage(order, appliedReward = null) {
    const freeItems = (Array.isArray(order?.items) ? order.items : []).filter(item =>
      Number(item.price) === 0 && (item.isLoyaltyReward === true || item.isWelcomeReward === true || item.isFreeOffer === true)
    );
    if (freeItems.length) {
      const item = freeItems[0];
      return template("Aaj aapko mila hai: {quantity} {item} free!", {
        quantity: Math.max(1, Number(item.qty) || 1), item: item.name || "reward"
      });
    }
    const kind = appliedReward?.kind || appliedReward?.definition?.kind;
    const title = appliedReward?.title || appliedReward?.definition?.title || "";
    if (kind === "free-delivery") return translateCore("Yay! Aaj ki delivery free hai!");
    if (["discount", "percent-discount"].includes(kind)) {
      return template("Yay! Aapko ₹{amount} ki bachat mili! {title}", {
        amount: Number(order?.discountAmount || 0).toLocaleString("en-IN"), title
      }).trim();
    }
    if (Number(order?.pointsRedeemed) > 0) {
      return template("Aapne {points} Craving Points use karke ₹{amount} bachaye!", {
        points: Number(order.pointsRedeemed).toLocaleString("en-IN"),
        amount: Number(order.discountAmount || 0).toLocaleString("en-IN")
      });
    }
    return "";
  }

  window.CustomerLanguage = {
    get: () => language,
    set: applyLanguage,
    t: translateCore,
    template,
    rewardMessage
  };

  document.addEventListener("DOMContentLoaded", () => {
    const selector = document.getElementById("customerLanguageSelect");
    if (selector) {
      selector.value = language;
      selector.addEventListener("change", () => applyLanguage(selector.value));
    }
    document.querySelectorAll("[data-first-visit-language]").forEach(button => {
      button.addEventListener("click", () => applyLanguage(button.dataset.firstVisitLanguage));
    });
    applyLanguage(language);
    const observer = new MutationObserver(records => {
      if (applying) return;
      for (const record of records) {
        if (record.type === "characterData") translateTextNode(record.target);
        else record.addedNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
          else if (node.nodeType === Node.ELEMENT_NODE) translateRoot(node);
        });
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  }, { once: true });
})();
