/*************************************************************************


███╗░░██╗██╗░░░██╗████████╗░██████╗██╗░░██╗███████╗██╗░░░░░██╗░░░░░
████╗░██║██║░░░██║╚══██╔══╝██╔════╝██║░░██║██╔════╝██║░░░░░██║░░░░░
██╔██╗██║██║░░░██║░░░██║░░░╚█████╗░███████║█████╗░░██║░░░░░██║░░░░░
██║╚████║██║░░░██║░░░██║░░░░╚═══██╗██╔══██║██╔══╝░░██║░░░░░██║░░░░░
██║░╚███║╚██████╔╝░░░██║░░░██████╔╝██║░░██║███████╗███████╗███████╗
╚═╝░░╚══╝░╚═════╝░░░░╚═╝░░░╚═════╝░╚═╝░░╚═╝╚══════╝╚══════╝╚══════╝

v1.0.8 - "Recursive Wikipedia Rabbithole"

( NOTE TO SELF: When updating version, remember to edit... )
( this js file's "Nutshell.version", include_nutshell.js   )
( and README.md what translations finished                 )
( ACTUALLY MAKE A RELEASE ON GITHUB                        )

You know how in Memento, the amnesia guy tattoos reminders on his body?
That is how I document my code. The following "documentation"
is for future Nicky to remember what the heck they were doing.
If you find it helpful, that is a side effect.

( ascii art made with https://fsymbols.com/generators/carty/ )


=========================
=== DESIGN PRINCIPLES ===
=========================

Dead Simple:
Just put a <script> in the heading and that's it.
That's why this file even contains the CSS & others' minified libraries
(This library doesn't even have any dependencies! <3)

Decentralized:
Nutshell Sections can be re-used across websites & authors!

Backwards Compatible:
Should work with blogs & writings that *already* exist.
Uses the standard markup to find sections: <h*>, <p>, etc
And heck, why not, Wikipedia API integration.

Minimalist:
don't send me any issues or pull requests for more features
thx


===================
=== TERMINOLOGY ===
===================

Nutshell: name of this library

Nutshell Section: a piece of text/html that can be embedded elsewhere.
  (sometimes just called "Section", or, confusingly, "Nutshell".)

Expandable: a button you can click to get an "expandable explanation"
  (also called just "Button" or "link". Look, I'm not consistent.)

Bubble: the box that expands below an expandable, containing a Nutshell Section


========================================
=== WHAT NUTSHELL NEEDS TO DO (SPEC) ===
========================================

1) Convert the top page (or a given element):

  a. Turn :links into expandable buttons
    <a href="pageURL#Heading">:link text</a>
    should be converted to an expandable labeled "link text", that when clicked,
    expands a bubble with the section found inside the purified HTML.

    Ways to get a section:
    * pageURL – Get whole article
    * By heading:
        #Heading – Find heading whose text matches,
          get everything up to next heading or break.
        #Heading&cut=[integer] – Same, but skip last [cut] elements
    * By paragraph text:
        #start=[text] – Get FIRST paragraph containing that text
        #start=[text]&length=[integer] – same, w/ followup <p>
        #start=[text]&end=[text] – same, til <p> that matches end.
    * Add before & after:
        &before=[markdown]&after=[markdown] – add html like pre-req's, commentary.

  b. Give <h*> headings two reveal-on-hover buttons:
    one for permalink, one to embed that Nutshell

  c. A modal dialogue to let readers embed Nutshells

  [NEW]
  d. A "close all Nutshells" button when more than one Expandable is open.

  By default, do all this on DOMContentLoaded (no need for images loaded first)

2) When an Expandable is opened, it should...

  a. Get HTML of the source page
    If already cached, use that.
    If not,
      Get raw HTML:
        - If *this* page, easy peasy.
        - If remote page, try fetch.
          If CORS fails, use iframe & postMessage to get the HTML
        - If it's Wikipedia, use their API.
      Process it:
        - DOMPurify it: no styles, no scripts, iframes allowed but sandboxed
        - Convert all links to absolute, and open in new tab
      Cache it!

  b. Make an element to contain the Section

    Get the Section's HTML from "#Heading", &before, &after, &start, &end, etc
    Do very forgiving search: case-insensitive, don't care about punctuation.
    Convert :links inside it to Nutshell Expandables, too (yay, recursion!)

  c. Put Section element below "expandable" (after punctuation) in a Bubble:
    - bubble head: link to source (if remote), embed button
    - bubble foot: close button

*************************************************************************/

{

    // it me
    window.Nutshell = {};

    // Version! & CDN
    Nutshell.version = 'v1.0.8';
    //Nutshell.cdn = `https://cdn.jsdelivr.net/gh/ncase/nutshell@${Nutshell.version}/nutshell.js`;
    Nutshell.cdn = `https://cdn.jsdelivr.net/gh/ncase/nutshell/nutshell.js`;

    // What's THIS page's URL? (WITH QUERYSTRING)
    Nutshell.thisPageURL = location.protocol + '//' + location.host + location.pathname + location.search;


    /////////////////////////////////////////////////////////////////////
    // ⭐️ Start Nutshell!
    /////////////////////////////////////////////////////////////////////

    // By default, start Nutshell on DOMContentLoaded
    // (you may want to delay this e.g. if your blog's content is AJAX'd in)
    window.addEventListener('DOMContentLoaded', ()=>{
        if(Nutshell.options.startOnLoad) Nutshell.start();
    });

    // NUTSHELL START
    Nutshell.start = (el=document.body)=>{

        // Restart!
        Nutshell.htmlCache = {};
        Nutshell._nutshellsOpen = 0;

        // IF TOP PAGE: Convert this page!
        // (By default, the whole document. But you can specify element,
        // i.e. leaving out comments section)
        // IF NOT TOP PAGE:
        // I must have been created for postMessage; give parent my HTML.
        if(window == window.top){

            // Add self's HTML to my own cached
            Nutshell.htmlCache[Nutshell.thisPageURL] = _purifyHTML(el.innerHTML, Nutshell.thisPageURL);

            // Add styles & convert page
            Nutshell.addStyles();
            Nutshell.hideHeadings(el);
            Nutshell.convertLinksToExpandables(el);
            Nutshell.convertHeadings(el);

            // Fill out other UI with localized text
            // (only set by user after Nutshell.js file included, hence this)
            Nutshell.fillCloseAllText();
            Nutshell.fillEmbedModalText();

        }else{

            // Tell my parent (from any origin) my HTML!
            _sendParentMyHTML();

        }
    };

    /////////////////////
    // Constants & Options
    /////////////////////

    const ANIM_TIME = 300; // 0.3 seconds
    const LOAD_WAIT_TIME = 6999; // 7 seconds
    const HEADER_TAGS = ['h1','h2','h3','h4','h5','h6'];

    Nutshell.options = {
        startOnLoad: true, // Start Nutshell on load? (default: true)
        lang: 'en', // Language (default: 'en', which is English)
        dontEmbedHeadings: false, // If 'true', removes the "embed this as a nutshell" option on headings
    };

    // A semantic sugar function to override options
    Nutshell.setOptions = (newOptions)=>{
        Object.keys(newOptions).forEach((key)=>{
            Nutshell.options[key] = newOptions[key];
        });
    };

    /////////////////////
    // Localizeable text
    /////////////////////

    Nutshell.language = {
        en: {

            // Button text
            closeAllNutshells: `close all nutshells`,
            learnMore: `learn more about Nutshell`,

            // Nutshell errors...
            notFoundError: `Uh oh, the page was not found! Double check the link:`,
            wikiError: `Uh oh, Wikipedia's not loading, or the link is broken. Please double check:`,
            corsError: `Uh oh, the page was found but didn't hand over its content! Check that the other site has Nutshell installed or CORS enabled:`,
            sectionIDError: `Uh oh, there's no section that matches the ID #[ID]! Watch out for typos & regional spelling differences.`,
            startTextError: `Uh oh, there's no paragraph that has the text “[start]”! Watch out for typos.`,

            // Embed modal!
            embedStep0: `You can embed this as an "expandable explanation" in your own blog/site!
                         Click to preview → [EXAMPLE]`,
            embedStep1: `Step 1) Copy this code into the [HEAD] of your site: [CODE]`,
            embedStep2: `Step 2) In your article, create a link to [LINK]
                         and make sure the link text starts with a :colon,
                         <a href="#">:like this</a>,
                         so Nutshell knows to make it expandable.`,
            embedStep3: `Step 3) That's all, folks! 🎉`,

            // What punctuation (in this language) should we KEEP after an expandable opens?
            keepPunctuation: `.,?!)_~'"’”`,
            // What punctuation (in this language) signifies the END of a sentence? Note, this is a regex.
            endPunctuation: /[.?!]\s/g

        },
        eo: {
            // Button text
            closeAllNutshells: `fermu ĉiujn nuksŝeloj`,
            learnMore: `lernu pli`,

            // Nutshell errors...
            notFoundError: `Ho ne, la paĝo ne estis trovita! Kontroli denove la ligilo:`,
            wikiError: `Ho ne, Vikipedio ne ŝargiĝas, aŭ la ligilo estas rompita. Bonvolu kontroli denove:`,
            corsError: `Ho ne, la paĝo estis trovita sed ne transdonis ĝian enhavon! Kontrolu, ke la alia retejo havas Nutshell instalita aŭ CORS ebligita:`,
            sectionIDError: `Ho ne, ne ekzistas sekcio kiu kongruas kun la ID #[ID]! Atentu tajperarojn kaj regionajn literumajn diferencojn.`,
            startTextError: `Ho ne, ne estas paragrafo kiu havas la tekston “[start]”! Atentu tajperarojn.`,

            // Embed modal!
            embedStep0: `Vi povas enmeti ĉi tion kiel "vastigebla klarigo" en via propra blogo/retejo!
                            Klaku por antaŭrigardi → [EXAMPLE]`,
            embedStep1: `Step 1) Kopiu ĉi tiun kodon en la [HEAD] de via retejo: [CODE]`,
            embedStep2: `Step 2) En via artikolo, kreu ligilon al [LINK]
                            kaj certigu, ke la ligteksto komenciĝas per :dupunkto,
                            <a href="#">:kiel tio</a>,
                            por tiu nuksoŝelo sciu certigi, ke ĝi disvastiĝas.`,
            embedStep3: `Step 3) Tio estas ĉio, homoj! 🎉`,

            // What punctuation (in this language) should we KEEP after an expandable opens?
            keepPunctuation: `.,?!)_~'"’”`,
            // What punctuation (in this language) signifies the END of a sentence? Note, this is a regex.
            endPunctuation: /[.?!]\s/g
        },
        fr: {

            // Button text
            closeAllNutshells: `fermer toutes les Nutshells`,
            learnMore: `en savoir plus`,

            // Nutshell errors...
            notFoundError: `Oh oh, la page n'as pas été trouvée! Lien à vérifier:`,
            wikiError: `Oh oh, Wikipédia n'envoie rien, ou le lien est cassé. S'il vous plaît, vérifiez:`,
            corsError: `Oh oh, la page a été trouvée mais refuse de nous donner son contenu! Vérifiez que l'autre site a Nutshell d'installé ou CORS d'activé:`,
            sectionIDError: `Oh oh, il n'existe pas de section avec l'identifiant #[ID]! Ça pourrait venir d'une faute de frappe ou d'une orthographe d'origine différente.`,
            startTextError: `Oh oh, il n'existe pas de paragraphe contenant “[start]”! Ça pourrait venir d'une faute de frappe.`,

            // Embed modal!
            embedStep0: `Vous pouvez insérer ceci comme "explication expansible" dans votre propre blog/site!
                         Cliquez pour prévisualiser → [EXAMPLE]`,
            embedStep1: `Étape 1) Copiez ce code dans le [HEAD] de votre site: [CODE]`,
            embedStep2: `Étape 2) Dans votre article, créez un lien vers [LINK]
                         et assurez vous que le texte du lien démarre avec :deux-points,
                         <a href="#">:comme ça</a>,
                         pour que Nutshell sache que c'est expansible.`,
            embedStep3: `Étape 3) Et voila! 🎉`,

            // What punctuation (in this language) should we KEEP after an expandable opens?
            keepPunctuation: `.,?!)_~'"’”`,
            // What punctuation (in this language) signifies the END of a sentence? Note, this is a regex.
            endPunctuation: /[.?!]\s/g

        },
        nl: {

            // Button text
            closeAllNutshells: `sluit alle Nutshells`,
            learnMore: `leer meer`,

            // Nutshell errors...
            notFoundError: `Uh oh, deze pagina kon niet worden gevonden! Controleer de link nogmaals:`,
            wikiError: `Uh oh, Wikipedia kan niet worden geladen, of de link doet het niet. Controleer nogmaals:`,
            corsError: `Uh oh, de pagina was gevoden, maar wilde zijn content niet doorgeven! Controleer of de andere site Nutshell heeft geïnstalleerd of CORS heeft geactiveerd.`,
            sectionIDError: `Uh oh, er is geen sectie die overeenkomt met ID #[ID]! Let op tikfouten en alternatieve spellingen.`,
            startTextError: `Uh oh, er is geen sectie met de tekst “[start]”! Pas op voor tikfouten.`,

            // Embed modal!
            embedStep0: `Je kunt deze 'uitklapbare uitleg' embedden in je eigen blog/site!
                         Klik voor een voorbeeld → [EXAMPLE]`,
            embedStep1: `Stap 1) Kopieer deze code naar de [HEAD] van je site: [CODE]`,
            embedStep2: `Stap 2) In je artikel, maak een link naar [LINK]
                         en zorg ervoor dat de link start met een :dubbelepunt,
                         <a href="#">:zoals dit</a>,
                         zodat Nutshell weet dat deze link moet uitklappen.`,
            embedStep3: `Stap 3) Dat is alles! 🎉`,

            // What punctuation (in this language) should we KEEP after an expandable opens?
            keepPunctuation: `.,?!)_~'"’”`,
            // What punctuation (in this language) signifies the END of a sentence? Note, this is a regex.
            endPunctuation: /[.?!]\s/g

        },
        de: {

            // Button text
            closeAllNutshells: `alle Nutshells schließen`,
            learnMore: `lern mehr`,

            // Nutshell errors...
            notFoundError: `Ups, die Seite konnte nicht gefunden werden! Prüfe den Link nochmals:`,
            wikiError: `Ups, Wikipedia konnt nicht geladen werden, oder der Link ist kaputt. Bitte prüfen:`,
            corsError: `Ups, die Seite wurde gefunden, hat ihren Inhalt jedoch nicht übergeben! Stelle sicher, dass bei der anderen Site Nutshell installiert oder CORS aktiviert ist:`,
            sectionIDError: `Ups, es gibt keine Sektion passend zur ID #[ID]! Prüfe auf Schreibfehler & regionsabhängige Unterschiede der Schreibweise.`,
            startTextError: `Ups, es gibt keinen Absatz mit dem Text “[start]”! Prüfe auf Schreibfehler.`,

            // Embed modal!
            embedStep0: `Du kannst dies als eine "ausklappbare Erklärung" auf deinem eigenen Blog/deiner eigenen Site einbinden!
                         Klick für eine Vorschau → [EXAMPLE]`,
            embedStep1: `Schritt 1) Kopiere diesen Code in den [HEAD] deiner Site: [CODE]`,
            embedStep2: `Schritt 2) Erzeuge einen Link zu [LINK] in deinem Artikel
                         und stelle dabei sicher, dass der Linktext mit einem :Doppelpunkt beginnt,
                         <a href="#">:also so</a>,
                         sodass Nutshell weiß, dass er ausklappbar sein soll.`,
            embedStep3: `Schritt 3) Das wars! 🎉`,

            // What punctuation (in this language) should we KEEP after an expandable opens?
            keepPunctuation: `.,?!)_~'"’”`,
            // What punctuation (in this language) signifies the END of a sentence? Note, this is a regex.
            endPunctuation: /[.?!]\s/g

        },
        pl: {

            // Button text
            closeAllNutshells: `zamknij wszystkie nutshelle`,
            learnMore: `Ucz się więcej`,

            // Nutshell errors...
            notFoundError: `Ups, nie znaleziono strony! Sprawdź link ponownie:`,
            wikiError: `Ups, Wikipedia się nie ładuje lub link nie działa. Sprawdź ponownie:`,
            corsError: `Ups, stronę znaleziono, ale nie przekazała ona swojej treści! Sprawdź, czy tamta witryna ma zainstalowany Nutshell lub włączone CORS:`,
            sectionIDError: `Ups, żadna sekcja nie pasuje do identyfikatora #[ID]! Zwróć uwagę na literówki i lokalne różnice w pisowni.`,
            startTextError: `Ups, żaden akapit nie zawiera tekstu “[start]”! Zwróć uwagę na literówki.`,

            // Embed modal!
            embedStep0: `Możesz to umieścić jako "rozszerzalne wyjaśnienie" na swoim blogu lub stronie!
                         Kliknij, aby zobaczyć podgląd → [EXAMPLE]`,
            embedStep1: `Krok 1) Skopiuj ten kod do [HEAD] swojej strony: [CODE]`,
            embedStep2: `Krok 2) Stwórz w swoim artykule link do [LINK]
                         i upewnij się, że tekst linku rozpoczyna się :dwukropkiem,
                         <a href="#">:w ten sposób</a>,
                         żeby Nutshell wiedział, aby umożliwić jego rozszerzanie.`,
            embedStep3: `Krok 3) To by było na tyle! 🎉`,

            // What punctuation (in this language) should we KEEP after an expandable opens?
            keepPunctuation: `.,?!)_~'"’”`,
            // What punctuation (in this language) signifies the END of a sentence? Note, this is a regex.
            endPunctuation: /[.?!]\s/g

        },
		es: {

            // Button text
            closeAllNutshells: `cerrar todos los nutshells`,
            learnMore: `aprende más`,

            // Nutshell errors...
            notFoundError: `¡Ups, no se encontró la página! Verifica el link:`,
            wikiError: `Ups, Wikipedia no está cargando, o el link está roto. Verifica:`,
            corsError: `¡Ups, la página se encontró pero esta no entregó su contenido! Verifica que la otra página tenga Nutshell instalado o CORS habilitado:`,
            sectionIDError: `¡Ups, no se ha encontrado la sección con la ID #[ID]! Verifica que no haya errores de tipeo o diferencias regionales de escritura.`,
            startTextError: `¡Ups, no hay ningún párrafo con el texto “[start]”! Verifica que no haya errores de tipeo.`,

            // Embed modal!
            embedStep0: `¡Puedes insertar esto como una “explicación expandible” en tu propio blog o página!
                         Click para previsualizar → [EXAMPLE]`,
            embedStep1: `Paso 1) Copia este código en la [HEAD] de tu sitio: [CODE]`,
            embedStep2: `Paso 2) En tu artículo, añade un link a [LINK]
                         y asegúrate de que el texto del link comience con :dos puntos,
                         <a href="#">:así</a>,
                         para que Nutshell sepa cómo expandirlo.`,
            embedStep3: `Paso 3) ¡Eso es todo, amigos! 🎉`,

            // What punctuation (in this language) should we KEEP after an expandable opens?
            keepPunctuation: `.,?!)_~'"’”`,
            // What punctuation (in this language) signifies the END of a sentence? Note, this is a regex.
            endPunctuation: /[.?!]\s/g

        },
        zh: {

            // Button text
            closeAllNutshells: `合上所有的nutshells`,
            learnMore: `学到更多`,

            // Nutshell errors...
            notFoundError: `啊 噢, 没有找到网页！请再次检查链接:`,
            wikiError: `啊 噢, 载入维基百科失败，或者说这个链接是失效了，请再次检查:`,
            corsError: `啊 噢, 网页找到了，但是它并没有交出它的内容！请检查其他站点是否已经安装了Nutshell或者允许跨域资源共享:`,
            sectionIDError: `啊 噢, 并没有段落能匹配这个ID #[ID]! 注意拼写错误 & 地区拼写差异。`,
            startTextError: `啊 噢, 并不存在包含“[start]”文本的段落！请检查拼写错误。`,

            // Embed modal!
            embedStep0: `你可以将此作为一个可展开的说明嵌入你自己的博客/站点！
                         点击右侧链接来预览 → [EXAMPLE]`,
            embedStep1: `第一步)复制这段代码至你站点的[HEAD]中: [CODE]`,
            embedStep2: `第二步)在你的文章中，创建一个链接链接至[LINK]
                         并确保链接中的文本以:冒号开头,
                         <a href="#">:就像这样</a>,
                         这样，Nutshell就知道要使其可展开。`,
            embedStep3: `第三步)就这么多，家人们! 🎉`,


            // What punctuation (in this language) should we KEEP after an expandable opens?
            keepPunctuation: `。.,?!)_~'"’”`, // added chinese period
            // What punctuation (in this language) signifies the END of a sentence? Note, this is a regex.
            endPunctuation: /[。.?!]\s/g // added chinese period

        },
        he: {
            // Button text
            closeAllNutshells: `סגור את כל האגוזים`,
            learnMore: `עוד אודות קליפת האגוז`,

            // Nutshell errors...
            notFoundError: `:אוי לא, הדף לא נמצא! בדקו שוב את הקישור`,
            wikiError: `:אוי לא, ויקיפדיה לא טוען, או שהלינק לא תקין. בבקשה בדקו שוב`,
            corsError: `:מופעל CORS מותקן או nutshell אוי לא, העמוד נמצא אך לא איפשר גישה לתוכן! בדקו אם לאתר יש `,
            sectionIDError: `.בדקו שגיאות כתיב והבדלי איות אזוריים ! #[ID] IDאוי לא, אין סעיף אשר תואם את ה`,
            startTextError: `.הזהרו משגיאות כתיב !“[start]” אוי לא, אין פסקה עם הטקסט`,

            // Embed modal!
            embedStep0: `!אתם יכול להטמיע זאת כ"הסבר הניתן להרחבה" בבלוג/אתר שלכם
                         [EXAMPLE] ← לחצו לתצוגה מוקדמת`,
            embedStep1: `[CODE] :של האתר שלכם [HEAD]צעד 1) העתיקו את הקוד הזה לתוך ה`,
            embedStep2: `[LINK]צעד 2) במאמר שלכם, תיצרו קישור ל
                         ודאגו שהטקסט של הלינק מתחיל עם :נקודותיים,
                         <a href="#">:ככה</a>
                         .ידע לעשות אותו ניתן להרחבה Nutshellכך ש`,
            embedStep3: `🎉 !צעד 3) זה הכל, חברים`,

            // What punctuation (in this language) should we KEEP after an expandable opens?
            keepPunctuation: `.,?!)_~'"’”`,
            // What punctuation (in this language) signifies the END of a sentence? Note, this is a regex.
            endPunctuation: /[.?!]\s/g
        },
        tr: {

            // Button text
            closeAllNutshells: `tüm Nutshell'leri kapat`,
            learnMore: `Nutshell hakkında daha fazla şey öğren`,

            // Nutshell errors...
            notFoundError: `Ah, sayfa bulunamadı! Linki tekrar kontrol edin:`,
            wikiError: `Ah, Wikipedia yüklenmiyor veya link bozuk. Lütfen tekrar kontrol edin:`,
            corsError: `Ah, sayfa bulundu ama içeriği görüntüleyemiyoruz! Diğer sitede de Nutshell'in kurulu veya CORS'un etkin olduğundan emin olunuz:`,
            sectionIDError: `Ah, #[ID] kimliğiyle eşleşen bir bölüm yok! Yazım hatalarına ve bölgesel yazım farklılıklarına dikkat edin.`,
            startTextError: `Ah, “[start]” metnine sahip bir paragraf yok! Yazım hatalarına dikkat edin.`,

            // Embed modal!
            embedStep0: `Bunu kendi web günlüğünüze/sitenize "genişletilebilir bir açıklama" olarak yerleştirebilirsiniz!
                         Önizlemek için tıklayın → [EXAMPLE]`,
            embedStep1: `Adım 1) Bu kodu sitenizin [HEAD] bölümüne kopyalayın: [CODE]`,
            embedStep2: `Adım 2) İçeriğinizde [LINK] için bir bağlantı oluşturun
                         ve bağlantı metninin :iki nokta ile başladığından emin olun
                         <a href="#">:bu şekilde</a>,
                         böylece Nutshell onu genişletmesi gerektiğini anlar.`,
            embedStep3: `Adım 3) İşte, hepsi bu kadar! 🎉`,

            // What punctuation (in this language) should we KEEP after an expandable opens?
            keepPunctuation: `.,?!)_~'"’”`,
            // What punctuation (in this language) signifies the END of a sentence? Note, this is a regex.
            endPunctuation: /[.?!]\s/g

        },
        ko: {

            // Button text
            closeAllNutshells: `껍질 모두 닫기`,
            learnMore: `껍질에 대해 더 배우기`,

            // Nutshell errors...
            notFoundError: `이런, 페이지를 찾지 못했어요! 주소를 다시 확인하세요:`,
            wikiError: `이런, 위키피디아가 로딩이 안 되거나 주소가 망가졌어요. 다시 확인해 주세요:`,
            corsError: `이런, 페이지를 찾았지만 내용물을 주지 않았어요! 그 다른 사이트가 껍질이 설치되었거나 CORS가 작동됐는지 확인하세요:`,
            sectionIDError: `이런, ID #[ID]에 맞는 부분이 없어요! 오타나 지역적인 철자의 차이를 주의하세요.`,
            startTextError: `이런, “[start]”라는 글이 있는 단락이 없어요! 오타를 주의하세요.`,

            // Embed modal!
            embedStep0: `이것을 당신의 블로그/사이트에 "펼칠 수 있는 설명"으로 첨부할 수 있어요!
                         눌러서 미리보기 → [EXAMPLE]`,
            embedStep1: `1) 이 코드를 당신의 사이트의 [HEAD]에 복사하세요: [CODE]`,
            embedStep2: `2) 당신의 글에 [LINK]로 가는 링크를 넣으세요
                         그리고 링크가 반드시 :쌍점으로 시작하게 하세요,
                         <a href="#">:이렇게</a>,
                         그래야지 프로그램이 이걸 펼칠 수 있게 만들어야 하는 걸 압니다.`,
            embedStep3: `3) 그게 다에요! 🎉`,

            // What punctuation (in this language) should we KEEP after an expandable opens?
            keepPunctuation: `.,?!)_~'"’”`,
            // What punctuation (in this language) signifies the END of a sentence? Note, this is a regex.
            endPunctuation: /[.?!]\s/g

        },
        hi: {

            // Button text
            closeAllNutshells: `सारे नटशेल्स बंद करे`,
            learnMore: `नटशेल के विषय में और जाने`,

            // Nutshell errors...
            notFoundError: `उह ओह, खोजा हुआ पेज नहीं मिला! लिंक को दोबारा जांचें:`,
            wikiError: `उह ओह, विकिपीडिया लोड नहीं हो रहा है, या लिंक टूटा हुआ है। कृपया लिंक की दोबारा जांच करें:`,
            corsError: `उह ओह, पेज  मिल गया लेकिन उससे  कंटेंट  नहीं मिल पाया हैः ! जांचें कि दूसरी साइट में नटशेल इन्सटाल्ड है या  CORS चालू है? :`,
            sectionIDError: `उह ओह, ऐसा कोई खंड नहीं है जो ID #[ID]! से मेल खाता हो! टाइपो और क्षेत्रीय स्पेलिंग अंतरों के लिए देखें।`,
            startTextError: `उह ओह, ऐसा कोई पैराग्राफ  नहीं है जिसमें टेक्स्ट "[start]" हो! टाइपिंग मिस्टेक की जांच करे ।`,

            // Embed modal!
            embedStep0: `आप इसे अपने स्वयं के ब्लॉग/साइट में "एक्सपेंडबल एक्सप्लनेशन (विस्तार योग्य स्पष्टीकरण)" के रूप में एम्बेड कर सकते हैं!
                         प्रीव्यू के लिए क्लिक करें → [EXAMPLE]`,
            embedStep1: `स्टेप  1) इस कोड को अपनी साइट के [HEAD] में कॉपी करें: [CODE]`,
            embedStep2: `स्टेप  2) अपने आर्टिकल  में, [LINK] के लिए एक लिंक बनाएँ
                         और सुनिश्चित करें कि लिंक टेक्स्ट एक :colon से शुरू होता है,
                         <a href="#">:इस तरह</a>,
                         तो नटशेल में इसे एक्सपेंडेनब्ल (विस्तार योग्य) बनाना जानता है।`,
            embedStep3: `स्टेप  3) बस इतना करके आप नटशेल यूज़ कर पाएंगे ! 🎉`,

            // What punctuation (in this language) should we KEEP after an expandable opens?
            keepPunctuation: `।.,?!)_~'"’”`,
            // What punctuation (in this language) signifies the END of a sentence? Note, this is a regex.
            endPunctuation: /[।?,.]\s/g

        },
        ru: {

            // Button text
            closeAllNutshells: `закрыть все пояснения`,
            learnMore: `узнать больше про Nutshell`,

            // Nutshell errors...
            notFoundError: `О нет, страница не найдена! Перепроверьте, что ссылка правильная:`,
            wikiError: `О нет, Википедия не загружается, или ссылка битая. Пожалуйста, перепроверьте её:`,
            corsError: `О нет, страница найдена, но не отдаёт содержимое! Проверьте, что на другом сайте установлен Nutshell или включён CORS:`,
            sectionIDError: `О нет, раздела с идентификатором #[ID] не существует! Проверьте, что вы не опечатались и учли все орфографические особенности.`,
            startTextError: `О нет, абзаца с текстом «[start]» не существует! Проверьте, что вы не опечатались.`,

            // Embed modal!
            embedStep0: `Вы можете встроить это «разворачиваемое пояснение» в свой собственный блог или сайт!
                         Нажмите для предпросмотра → [EXAMPLE]`,
            embedStep1: `Шаг 1) Скопируйте этот код в элемент [HEAD] на вашем сайте: [CODE]`,
            embedStep2: `Шаг 2) На нужной странице сделайте ссылку на [LINK]
                         и убедитесь, что текст ссылки начинается с :двоеточия,
                         <a href="#">:вот так</a>,
                         чтобы Nutshell знал, что её можно развернуть.`,
            embedStep3: `Шаг 3) Вот и всё! 🎉`,

            // What punctuation (in this language) should we KEEP after an expandable opens?
            keepPunctuation: `.,?!)_~'"’”»`,
            // What punctuation (in this language) signifies the END of a sentence? Note, this is a regex.
            endPunctuation: /[.?!]\s/g

        },
        vi: {

            // Button text
            closeAllNutshells: `đóng tất cả các nutshell`,
            learnMore: `tìm hiểu thêm về Nutshell`,

            // Nutshell errors...
            notFoundError: `Ôi không, không thể tìm thấy trang! Kiểm tra lại link:`,
            wikiError: `Ôi không, có thể Wikipedia bị hư, hoặc trang không tồn tại. Kiểm tra lại link:`,
            corsError: `Ôi không, trang tồn tại nhưng không cho phép truy cập! Kiểm tra trang đã tải Nutshell hay bật CORS chưa:`,
            sectionIDError: `Ôi không, không có phần nào được gán ID #[ID]! Kiểm tra lỗi chính tả.`,
            startTextError: `Ôi không, không có đoạn nào có câu “[start]”! Kiểm tra lỗi chính tả.`,

            // Embed modal!
            embedStep0: `Bạn có thể nhúng phần này như là phần "giải thích mở rộng" trên website của bạn!
                         Click để xem thử → [EXAMPLE]`,
            embedStep1: `Step 1) Copy code này vào phần [HEAD] trong website của bạn: [CODE]`,
            embedStep2: `Step 2) Trong bài viết của bạn, tạo đường link tới [LINK]
                         và luôn luôn đặt dấu :hai chấm phía trước đường link,
                         <a href="#">:như thế này</a>,
                         để Nutshell biết mở rộng phần này.`,
            embedStep3: `Step 3) Xong rồi đấy! 🎉`,

            // What punctuation (in this language) should we KEEP after an expandable opens?
            keepPunctuation: `.,?!)_~'"’”`,
            // What punctuation (in this language) signifies the END of a sentence? Note, this is a regex.
            endPunctuation: /[.?!]\s/g
		},
    };

    Nutshell.getLocalizedText = (textID)=>{
        let currentLanguage = Nutshell.options.lang,
            dictionary = Nutshell.language[currentLanguage];
        return dictionary[textID];
    }




    /////////////////////////////////////////////////////////////////////
    // ⭐️ Convert links to Expandable buttons
    /////////////////////////////////////////////////////////////////////

    Nutshell.convertLinksToExpandables = (dom, forThisElement)=>{

        // Get an array of all links, filtered by if the text starts with a :colon
        let expandables = [...dom.querySelectorAll('a')].filter(
            link => (link.innerText.trim().indexOf(':')==0)
        );

        // Turn each one into an Expandable!
        expandables.forEach((ex)=>{

            // Style: closed Expandable
            ex.classList.add('nutshell-expandable');
            ex.setAttribute("mode", "closed");

            // Remove colon, replace with animated balls
            let linkText = document.createElement('span');
			// XSS vulnerability if without DOMPurify! (see https://github.com/ncase/nutshell/issues/32)
			// Not using .innerText so that latex in links still works!
            linkText.innerHTML = DOMPurify.sanitize(ex.innerText.slice(ex.innerText.indexOf(':')+1));
            linkText.className = 'nutshell-expandable-text';
            let ballUp = document.createElement('span');
            ballUp.className = 'nutshell-ball-up';
            let ballDown = document.createElement('span');
            ballDown.className = 'nutshell-ball-down';
            ex.innerHTML = '';
            ex.appendChild(linkText);
            ex.appendChild(ballUp);
            ex.appendChild(ballDown);

            // BALLS ARE SAME AS FONT COLOR
            let linkStyle = window.getComputedStyle(forThisElement ? forThisElement : ex);
            ballUp.style.background = linkStyle.color;
            ballDown.style.background = linkStyle.color;

            // Save the punctuation!
            // Extremely inefficient: plop each character one-by-one into the span
            let punctuation = document.createElement('span');
            if(ex.nextSibling && ex.nextSibling.nodeValue){
                let nextChar;
                // get next char, is it punctuation?
                let keepPunctuation = Nutshell.getLocalizedText('keepPunctuation');
                while( keepPunctuation.indexOf(nextChar=ex.nextSibling.nodeValue[0]) >= 0 ){
                    ex.nextSibling.nodeValue = ex.nextSibling.nodeValue.slice(1); // slice off the rest
                    punctuation.innerHTML += nextChar; // slap it on
                }
            }
            ex.parentNode.insertBefore(punctuation, ex.nextSibling); // add right after expandable

            // Follow up by repeating last sentence, UNLESS IT'S THE START/END OF PARAGRAPH ALREADY.
            let hasWordsAfterExpandable = punctuation.nextSibling
                                          && punctuation.nextSibling.nodeValue
                                          && punctuation.nextSibling.nodeValue.trim().length>1;
            let followupSpan = document.createElement('span');
            followupSpan.style.display = 'none';
            followupSpan.className = 'nutshell-followup';
            ex.parentNode.insertBefore(followupSpan, punctuation.nextSibling); // add right after punctuation

            // Short or long followup TEXT?
            let shortFollowupHTML = '...', // just dots
                longFollowupHTML = '';
            if(hasWordsAfterExpandable){

                // Get last sentence...
                let htmlBeforeThisLink = ex.parentNode.innerHTML.split( ex.outerHTML )[0]; // everything BEFORE this html
                // Convert to raw text
                let tmpSpan = document.createElement('span');
                    tmpSpan.innerHTML = htmlBeforeThisLink;
                // Get immediately previous sentence
                let textBeforeThinkLink = tmpSpan.innerText,
                    sentencesBeforeThisLink = textBeforeThinkLink.split(Nutshell.getLocalizedText('endPunctuation')),
                    lastSentenceHTML = sentencesBeforeThisLink[sentencesBeforeThisLink.length-1];

                // Follow up with prev sentence, then expandable text in bold, then punctuation
                longFollowupHTML = lastSentenceHTML + '<b>' + ex.innerHTML + '</b>' + punctuation.innerHTML;

            }
            // Method needs to be publicly accessible, I guess
            ex.updateFollowupText = ()=>{
                if(!bubble || !hasWordsAfterExpandable){
                    // if closed (or no words after), hide followup span
                    followupSpan.style.display = 'none';
                }else{
                    // if open, show only if bubble's textContent is above 50 words
                    let longEnough = (bubble.textContent.trim().split(" ").length>=50);
                    followupSpan.style.display = 'inline';
                    followupSpan.innerHTML = longEnough ? longFollowupHTML : shortFollowupHTML;
                }
            };

            // OPEN & CLOSE THAT BUBBLE.
            let bubble = null;
            ex.isOpen = false;
            ex.open = (mouseEvent)=>{

                // Hi
                ex.isOpen = true;

                // Insert a bubble
                //debugger;
                // A display:contents wrapper has no box. Use the rendered parent
                // so viewport coordinates do not become a bubble-local offset.
                let boxParent = ex.parentNode;
                while(boxParent && window.getComputedStyle(boxParent).display==='contents') boxParent = boxParent.parentElement;
                let clickX = mouseEvent.clientX - (boxParent || document.body).getBoundingClientRect().x;
                bubble = Nutshell.createBubble(ex, clickX);
                ex.parentNode.insertBefore(bubble, punctuation.nextSibling); // place the bubble AFTER PUNCTUATION
                ex.setAttribute("mode", "open");
                ex.updateFollowupText();

                // One more
                Nutshell._nutshellsOpen++;
                Nutshell._updateCloseAllNutshells();
            };
            ex.close = ()=>{

                // Bye
                ex.isOpen = false;

                // Close that bubble
                bubble.close(); // handles its own UI
                bubble = null;
                ex.setAttribute("mode", "closed");
                setTimeout(ex.updateFollowupText, ANIM_TIME);

                // One less
                Nutshell._nutshellsOpen--;
                Nutshell._updateCloseAllNutshells();

            };
            // ON CLICK: toggle open/closed
            ex.addEventListener('click',(e)=>{
                // Don't actually go to that link.
                e.preventDefault();
                // Toggle create/close
                if(!ex.isOpen) ex.open(e); // Is closed, make OPEN
                else ex.close(e); // Is open, make CLOSED
            });

        });
    };

    /////////////////////////////////////////////////////////////////////
    // ⭐️ CLOSE ALL NUTSHELLS
    /////////////////////////////////////////////////////////////////////

    // Keep count
    Nutshell._nutshellsOpen = 0;

    // Close 'em all
    Nutshell.closeAllNutshells = ()=>{

        // Close only the top level ones...
        let allExpandables = [...document.querySelectorAll('.nutshell-expandable')],
            nestedExpandables = [...document.querySelectorAll('.nutshell-expandable .nutshell-expandable')];
            onlyOpenTops = allExpandables.filter( (ex)=>{
                return ex.isOpen && !nestedExpandables.includes(ex);
            });

        // Close all open tops
        onlyOpenTops.forEach((ex)=>{ex.close()});

        // And after some time, reset the "close all nutshells" count & button
        setTimeout(()=>{
            Nutshell._nutshellsOpen = 0;
            Nutshell._updateCloseAllNutshells();
        },ANIM_TIME+100);

    };

    // MAKE UI: Floating in top right
    Nutshell.closeAllButton = document.createElement('div');
    let _ca = Nutshell.closeAllButton;
    _ca.id = "nutshell-close-all";
    _ca.setAttribute('show', 'no');
    _ca.onclick = Nutshell.closeAllNutshells;

    // When Nutshell starts, populate with text localization
    Nutshell.fillCloseAllText = ()=>{
        _ca.innerText = Nutshell.getLocalizedText('closeAllNutshells');
        document.body.appendChild(_ca);
    };

    // If 2 or more, show it, else hide it.
    Nutshell._updateCloseAllNutshells = ()=>{
        if(Nutshell._nutshellsOpen>=2){

            // Show it if hidden
            if(_ca.getAttribute('show')=='no'){
                _ca.style.display = 'block';
                setTimeout(()=>{
                    _ca.setAttribute('show', 'yes');
                },1);
            }

        }else{

            // Hide it if shown
            if(_ca.getAttribute('show')=='yes'){
                _ca.setAttribute('show', 'no');
                setTimeout(()=>{
                    _ca.style.display = 'none';
                },1000);
            }

        }
    };


    /////////////////////////////////////////////////////////////////////
    // ⭐️ Get purified HTML, given a source URL.
    /////////////////////////////////////////////////////////////////////

    // Not very picky about what's in the cache
    // Could be just <p>'s, or the entire <body> with nav & comments
    Nutshell.htmlCache = {};

    // Promise PROCESSED html!
    // From a URL, try cache, remote, wikipedia...
    // Then DOMPurify it.
    Nutshell.promisePurifiedHTMLFromURL = (url)=>{

        // A promise...
        return new Promise(async (resolvePurifiedHTML, rejectPurifiedHTML)=>{

            // If already in cache, return that.
            if(Nutshell.htmlCache[url]){
                resolvePurifiedHTML(Nutshell.htmlCache[url]);
                return; // STOP.
            }

            // If not, what kind of link is it?
            if(_isWikipedia(url)){

                // IT'S WIKIPEDIA! USE THAT API.
                let urlObject = new URL(url);
                // The article title is the last bit of the path
                let splitPath = urlObject.pathname.split('/');
                    articleTitle = decodeURIComponent( splitPath[splitPath.length-1] );
                // Which language wikipedia? (including Simple...)
                let domain = urlObject.host.split('.')[0];
                // get section of article, if any
                let sectionID = urlObject.hash.slice(1);
                
                // Fetch lede
                let resourceParams = {
                    // Request from anywhere, in JSON
                    action: "query", origin: "*", format: "json",
                    // Extract just the lead paragraph & thumbnail
                    prop: "extracts|pageimages|sections", exintro: "", pithumbsize:500,
                    // THIS PAGE
                    titles: articleTitle
                }
                // Parse API
                let params = {
                    action: "parse", origin: "*", format: "json",
                    page: articleTitle,
                    prop: "text|sections"
                }
                let resourceQueryString = _objectToURLParams(resourceParams);
                
                let parseQueryString = _objectToURLParams(params);

                let parseURL = `https://${domain}.wikipedia.org/w/api.php?${parseQueryString}`
                let found = false;
                await fetch(parseURL)
                    .then(response => response.json())
                    .then(data => {
                        const sections = data.parse.sections;
                        for(let i = 0; i < sections.length; i++){
                            if(sections[i].anchor === sectionID){
                                params.section = sections[i].index;
                                found = true;
                                break;
                            }
                        } 
                    }
                );

                if(found){
                    fetch(`https://${domain}.wikipedia.org/w/api.php?${_objectToURLParams(params)}`)
                        .then(response => response.json())
                        .then(data => {
                            let pageHTML = data.parse.text['*'];
                            // show images
                            pageHTML = pageHTML.replaceAll("\"//upload.wikimedia.org/", "\"https://upload.wikimedia.org/");
                            // remove all elements with class editsection
                            pageHTML = pageHTML.replace(/<span class="mw-editsection">.*?<\/span>/g, "");
                            // remove all links with title that starts with Edit Section
                            pageHTML = pageHTML.replace(/<a.*?title="Edit section.*?<\/a>/g, "");
                            pageHTML = pageHTML.replace(/<span class="mw-editsection-bracket">.*?<\/span>/g, "");

                            // create valid links 
                            pageHTML = pageHTML.replaceAll(/href="\/wiki/g, `href="https://${domain}.wikipedia.org/wiki`);
                            
                            // get all a tags with wiki links and any title and change inner text to have : in front 
                            // don't touch images
                            pageHTML = pageHTML.replace(/<a.*?href="https:\/\/.*?\.wikipedia\.org\/wiki\/(.*?)".*?>(.*?)<\/a>/g, (match, p1, p2) => {
                                // if it's an image, don't touch it
                                if(p1.includes("File:")){
                                    return match;
                                }
                                return `<a href="https://${domain}.wikipedia.org/wiki/${p1}">:${p2}</a>`;
                            });

                            Nutshell.htmlCache[url] = pageHTML;
                            // FULFIL THE PROPHECY
                            resolvePurifiedHTML( Nutshell.htmlCache[url] );

                        });
                }else{
                let resourceURL = `https://${domain}.wikipedia.org/w/api.php?${resourceQueryString}`;
                fetch(resourceURL)
                    .then(response => response.json())
                    .then(data => {

                        // Get extract
                        let pageKey = Object.keys(data.query.pages)[0],
                            pageHTML = data.query.pages[pageKey].extract;

                        // Prepend thumbnail, if any
                        if(data.query.pages[pageKey].thumbnail){
                            pageHTML = `<img width=300 src='${data.query.pages[pageKey].thumbnail.source}' data-float=right />`+ pageHTML;
                        }

                        // Cache it
                        Nutshell.htmlCache[url] = pageHTML;

                        // FULFIL THE PROPHECY
                        resolvePurifiedHTML(pageHTML);

                    });
                }
                // (Wait some time before giving up, and telling user)
                setTimeout(()=>{
                    rejectPurifiedHTML(
                        `<p>
                        ${Nutshell.getLocalizedText("wikiError")}
                        <a target='_blank' href='${url}'>${url}</a>
                        </p>`
                    );
                },LOAD_WAIT_TIME);

            }else if(_isYouTube(url)){

                // Get the video ID - youtube.com or youtu.be
                // and other URL params like time.
                url = new URL(url);
                let videoID, t;
                if( url.host.indexOf("youtube.com") >= 0 ){
                    videoID = url.searchParams.get('v');
                }else if( url.host.indexOf("youtu.be") >= 0 ){
                    videoID = url.pathname.slice(1);
                }
                t = parseInt( url.searchParams.get("t") || url.searchParams.get("start") || '0' );

                // Gimme, easy peasy.
                // weird css hack to make the iframe scale aspect-ratio.
                resolvePurifiedHTML(`
                    <div style="width:100%;padding-top:56.25%;position:relative;margin:1em 0;">
                        <iframe
                            style="position:absolute;width:100%;height:100%;top:0;left:0;"
                            src="https://www.youtube-nocookie.com/embed/${videoID}?start=${t}&rel=0"
                            title="YouTube video player"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen>
                        </iframe>
                    </div>
                `);

            }else{

                // OTHERWISE, the usual: fetch remote

                // FIRST, get RAW HTML.
                let getRawHTMLPromise = new Promise((resolveRawHTML, rejectRawHTML)=>{
                    fetch(url)
                        .then(response => {
                            if(!response.ok) throw Error('404'); // 404's ain't ok
                            else return response.text();
                        })
                        .then(data => {
                            // No, I don't know why I can't just do data=>resolveRawHTML
                            resolveRawHTML(data); // anyway, yay it worked.
                        })
                        .catch(err => {

                            // If it failed due to 404, tell user
                            if(err.message=='404'){
                                return rejectPurifiedHTML(
                                    `<p>
                                    ${Nutshell.getLocalizedText("notFoundError")}
                                    <a target='_blank' href='${url}'>${url}</a>
                                    </p>`
                                );
                            }else{

                                // Otherwise, *assume* it failed due to CORS.
                                // (browser can't tell me directly for security reasons)
                                // Try using iframe & postMessage to get the HTML:

                                // Set up safe iframe to speak to...
                                let safeIframe = document.createElement('iframe');
                                safeIframe.setAttribute('sandbox','allow-scripts');
                                safeIframe.style.display = 'none';
                                safeIframe.src = url;

                                // Set up listener...
                                let _messageListener = window.addEventListener("message", (message)=>{
                                    let data = JSON.parse(message.data);
                                    // Only accept this message if it's loading the URL we want:
                                    // (Otherwise, problems when loading multiple URLs at same time)
                                    if(data.url == url){
                                        _removeIframeAndListener(); // done!
                                        resolveRawHTML(data.html);
                                    }
                                });

                                // Callback to remove both...
                                let _alreadyRemoved = false;
                                let _removeIframeAndListener = ()=>{
                                    if(_alreadyRemoved) return; // once-r
                                    window.removeEventListener("message", _messageListener);
                                    document.body.removeChild(safeIframe);
                                    _alreadyRemoved = true;
                                };

                                // Go!
                                document.body.appendChild(safeIframe);

                                // (Wait some time before giving up, and telling user)
                                setTimeout(()=>{
                                    _removeIframeAndListener();
                                    rejectPurifiedHTML(
                                        `<p>
                                        ${Nutshell.getLocalizedText("corsError")}
                                        <a target='_blank' href='${url}'>${url}</a>
                                        </p>`
                                    );
                                },LOAD_WAIT_TIME);

                            }
                        });
                });

                // SECOND, make PROCESSED HTML
                getRawHTMLPromise.then((rawHTML)=>{
                    // Cache & gimme.
                    Nutshell.htmlCache[url] = _purifyHTML(rawHTML, url);
                    resolvePurifiedHTML( Nutshell.htmlCache[url] );
                });
            }
        });
    };

    // PURIFY. (& make src's absolute)
    let _purifyHTML = (rawHTML, baseURL)=>{

        // DOMPurify: no styles, no scripts, iframes allowed (but sandboxed later)
        let cleanHTML = DOMPurify.sanitize(rawHTML,{
            FORBID_ATTR: ['style','id','class'],
            FORBID_TAGS: ['style'],
            ADD_TAGS: ['iframe','audio','video']
        });

        // A <span> for further editing the clean HTML.
        let cleanSpan = document.createElement('div');
        cleanSpan.innerHTML = cleanHTML;

        // Sandbox all iframes
        [...cleanSpan.querySelectorAll('iframe')].forEach(iframe=>{
            iframe.setAttribute('sandbox','allow-scripts');
        });

        // Image src's + link href's to absolute
        _convertRelativeToAbsoluteLinks("iframe", "src", baseURL, cleanSpan);
        _convertRelativeToAbsoluteLinks("img", "src", baseURL, cleanSpan);
        _convertRelativeToAbsoluteLinks("a", "href", baseURL, cleanSpan);

        // Make all links open in new tab, don't ruin reading flow.
        [...cleanSpan.querySelectorAll('a')].forEach((a)=>{
            a.target = "_blank";
        });

        // Gimme
        return cleanSpan.innerHTML;

    };

    // Is it Wikipedia?
    let _isWikipedia = (url)=>{
        return url.indexOf('wikipedia.org')>=0;
    };

    // Is it YouTube?
    let _isYouTube = (url)=>{
        if(url.indexOf('youtu.be')>=0) return true;
        if(url.indexOf('youtube.com')>=0) return true;
        return false;
    };

    // Convert key-values to key1=value1&key2=value2 etc. Also encode URI
    let _objectToURLParams = (obj)=>{
        return Object.keys(obj)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
            .join("&");
    };

    // Convert all links in a element to absolute links
    let _convertRelativeToAbsoluteLinks = (tag, attr, baseURL, el)=>{
        [...el.querySelectorAll(tag)].forEach((el)=>{
            let relative = el.getAttribute(attr),
                absolute = new URL(relative,baseURL).href;
            el[attr] = absolute;
        });
    };

    // Ma, here's my HTML!
    let _sendParentMyHTML = ()=>{
        window.parent.postMessage(
            JSON.stringify({
                url: Nutshell.thisPageURL, // the url I'm repping
                html: document.body.innerHTML
            }),
        '*');
    };



    /////////////////////////////////////////////////////////////////////
    // ⭐️ Get a Section from purified HTML & put in container
    /////////////////////////////////////////////////////////////////////

    // Promise!
    Nutshell.promiseSectionContainer = (expandable)=>{

        // A promise...
        return new Promise((resolve,reject)=>{

            // Get expandable's url & queryString
            let href = expandable.href,
                splitHref = href.split("#"),
                url = expandable.href,
                queryString = splitHref[1];

            // The container for the Section... get it, boiiiiii.
            let container = document.createElement('div'),
                containerHTML = '';

            // After getting the purified HTML, find section,
            // then put it in a container, and resolve with that.
            Nutshell.promisePurifiedHTMLFromURL(url).then((purifiedHTML)=>{

                if(_isWikipedia(url) || _isYouTube(url)){
                    // If it's Wikipedia or YouTube, just give it, it's already ready!
                    containerHTML = purifiedHTML;
                }else{

                    // Otherwise, gotta EXTRACT out the section from the HTML...

                    /***
                    Ways to get a section:
                    * pageURL – Get whole article
                    * By heading:
                        #Heading – Find heading whose text matches,
                          get everything up to next heading or break.
                        #Heading&cut=[integer] – Same, but skip last [cut] elements
                    * By paragraph text:
                        #start=[text] – Get FIRST paragraph containing that text
                        #start=[text]&length=[integer] – same, w/ followup <p>
                        #start=[text]&end=[text] – same, til <p> that matches end.
                    * Add before & after:
                        &before=[markdown]&after=[markdown] – add html like pre-req's, commentary.
                    ***/

                    // An element to safely search
                    let safeEl = document.createElement('div');
                    safeEl.innerHTML = purifiedHTML;

                    // IF NO SECTION ID, give entire article
                    if(!queryString || queryString.trim()==''){
                        // Hidden sections should still be hidden
                        Nutshell.hideHeadings(safeEl);
                        // Folded sections need to convert relative links to absolute
                        _convertRelativeToAbsoluteLinks("a", "href", url, safeEl);
                        // Article is assumed to be the container of the first <p>
                        let assumedArticle = safeEl.querySelector('p').parentNode;
                        resolve(assumedArticle);
                        return;
                    }

                    // Break up query string...
                    let queryStringBroken = queryString.split('&');
                    let queryKeys = {};
                    queryStringBroken.forEach((term)=>{
                        if(term.indexOf("=")>0){
                            let keyvalue = term.split("="),
                                key = keyvalue[0],
                                value = keyvalue[1];
                            queryKeys[key] = value;
                        }
                    });

                    // If the first term has no "=", then we're searching by heading.
                    // Otherwise, we're searching by text in paragraphs.
                    let isSearchingByHeading = (queryStringBroken[0].indexOf("=")<0);

                    //////////////////////////
                    // SEARCH BY HEADER...
                    //////////////////////////

                    if(isSearchingByHeading){

                        let sectionID = queryStringBroken[0];

                        // Forgiving-search the <headings> for #Heading
                        let foundHeading = null;
                        for(let i=0; i<HEADER_TAGS.length; i++){
                            let tag = HEADER_TAGS[i],
                                headings = [...safeEl.querySelectorAll(tag)];
                            // ...and for each heading of that <h*> tag...
                            for(let j=0; j<headings.length; j++){
                                let heading = headings[j];
                                // Do _forgivingMatchTest, return THE FIRST ONE THAT WORKS, BREAK.
                                if(_forgivingMatchTest(heading.innerText, sectionID)){
                                    foundHeading = heading;
                                }
                                if(foundHeading) break;
                            }
                            if(foundHeading) break;
                        }

                        // If after all that, STILL none, tell user the error.
                        if(!foundHeading){
                            containerHTML = `<p>${Nutshell.getLocalizedText("sectionIDError").replace('[ID]',sectionID)}</p>`;
                        }else{

                            // Now get everything from the start of the section (right after heading)
                            // to end of section (next heading, <hr>, or end-of-post)

                            // HTMLs to add (making an array so can cut in retrospect)
                            let htmlsToAdd = [];

                            // Iterate node by node...
                            let currentNode = foundHeading,
                                foundEndOfSection = false;
                            while(!foundEndOfSection){
                                // Do I even have a next sibling?
                                currentNode = currentNode.nextSibling; // not .nextElementSibling in case writer forgot to put stuff in <p>???
                                if(currentNode){

                                    // If yes, what's its tag?
                                    if(currentNode.tagName){
                                        // If it's a heading or <hr>, FOUND END.
                                        let currentTag = currentNode.tagName.toLowerCase();
                                        if(HEADER_TAGS.indexOf(currentTag)>=0 || currentTag=='hr'){
                                            foundEndOfSection = true;
                                        }else{
                                            // If not, add it & move on.
                                            htmlsToAdd.push(currentNode.outerHTML);
                                        }
                                    }else{
                                        let content = currentNode.textContent.trim();
                                        if(content.length>0){ // convert to <p> then add
                                            htmlsToAdd.push("<p>"+content+"</p>");
                                        }
                                    }
                                }else{
                                    // ...If no next sibling, FOUND END.
                                    foundEndOfSection = true;
                                }
                            }

                            // Add 'em all!
                            let cut = queryKeys.cut ? parseInt(queryKeys.cut) : 0;
                            for(let i=0;i<htmlsToAdd.length - cut;i++){
                                containerHTML += htmlsToAdd[i];
                            }

                        }

                    }else{

                        /////////////////////////////////
                        // OTHERWISE, SEARCH BY TEXT...
                        /////////////////////////////////

                        // START?
                        if(queryKeys.start){

                            let startText = decodeURIComponent(queryKeys.start);

                            // Forgiving-search the <p> for "start"
                            let found = null;
                            let paragraphs = [...safeEl.querySelectorAll('p')];
                            for(let i=0; i<paragraphs.length; i++){
                                let p = paragraphs[i];
                                if(_forgivingMatchTest(p.innerText, startText)){
                                    found = p;
                                }
                                if(found) break;
                            }

                            // If after all that, STILL none, tell user the error.
                            if(!found){
                                containerHTML = `<p>${Nutshell.getLocalizedText("startTextError").replace('[start]',startText)}</p>`;
                            }else{

                                // Add the found paragraph.
                                containerHTML += found.outerHTML;

                                // If there's a "length" key, add that many extra siblings
                                // (or until end of section
                                if(queryKeys.length || queryKeys.end){

                                    // Countdown and/or END TEXT
                                    let elementsLeft = queryKeys.length ? parseInt(queryKeys.length)-1 : Infinity;
                                    let endText = decodeURIComponent(queryKeys.end);

                                    // Find the end of section, or countdown, or ending paragraph.
                                    let currentNode = found,
                                        foundEndOfSection = false;
                                    while(!foundEndOfSection && elementsLeft>0){

                                        // Next
                                        currentNode = currentNode.nextSibling; // not .nextElementSibling in case writer forgot to put stuff in <p>???

                                        // Do I even have a next sibling?
                                        if(currentNode){

                                            // Convert to a paragraph if it was accidentally not in <p>
                                            let content;
                                            if(!currentNode.tagName){
                                                content = currentNode.textContent;
                                                if(content.trim().length==0){
                                                    continue; // nevermind
                                                }else{
                                                    content = "<p>"+content+"</p>";
                                                }
                                            }else{
                                                content = currentNode.outerHTML;
                                            }

                                            // If this paragraph matches, it's THE END!
                                            if(_forgivingMatchTest(content, endText)){
                                                foundEndOfSection = true;
                                            }

                                            // Add it to the container & move on.
                                            containerHTML += currentNode.outerHTML;
                                            elementsLeft--;

                                        }else{
                                            // ...If no next sibling, FOUND END.
                                            foundEndOfSection = true;
                                        }

                                    }
                                }

                            }

                        }

                    }

                    // ADD BEFORE & AFTER
                    if(queryKeys.before){
                        containerHTML = _decodeParsePurifyItalics(queryKeys.before) + containerHTML;
                    }
                    if(queryKeys.after){
                        containerHTML = containerHTML + _decodeParsePurifyItalics(queryKeys.after);
                    }


                }

                // Now deliver the promised container, containing the section!
                container.innerHTML = _addSource(url) + containerHTML;
                resolve(container);

            }).catch((message)=>{

                // IF SOMETHING ALONG THIS ENTIRE PROCESS WENT WRONG, TELL USER.
                container.innerHTML = message;
                resolve(container);

            });

        });

    };

    // Decode, Parse, Purify, Italics
    let _decodeParsePurifyItalics = (whatever)=>{
        return "<i>"+DOMPurify.sanitize(marked.parse(decodeURIComponent(whatever)))+"</i>";
    }

    // Add "from" source paragraph, if source is not THIS page
    let _addSource = (url)=>{
        if(url == Nutshell.thisPageURL){
            return ''; // nah.
        }else{
            let urlSansProtocol = url.split("://")[1];
            return `<p class='nutshell-bubble-from'> from <a target='_blank' href='${url}'>${urlSansProtocol}</a></p>`
        }
    }

    // Do a forgiving match between two strings: src, test
    // Capitalization & punctuation insensitive + src at least CONTAINS test
    let _forgivingMatchTest = (src, test)=>{

        // Lowercase & strip everything but letters & numbers
        src = src.toLowerCase().replace(/[^a-z0-9]/g,'');
        test = test.toLowerCase().replace(/[^a-z0-9]/g,'');

        // Src at least CONTAINS test?
        let srcContainsTest = (src.indexOf(test)>=0);
        return srcContainsTest;

    };



    /////////////////////////////////////////////////////////////////////
    // ⭐️ Create & return bubble, using an expandable's data
    /////////////////////////////////////////////////////////////////////

    Nutshell.createBubble = (expandable, clickX)=>{

        /**************************

        BUBBLE ELEMENT & ANIMATION STRUCTURE

        Bubble:
        - Arrow (sticks out of bubble)
        - Overflow container
          - Embed button, reveal on hover
          - Section (left & right padded)
            - "from URL..."
            - Recursive bubbles (sticks out of padding)
          - Close button

        Animation:
          Opening:
            - calculate Section height
            - animate Overflow's height from 0px to (section height + head/foot)px
            - then make Overflow's height auto again (so can stretch when recursive bubbles appear)
          Closing:
            - animate Overflow's height going to 0
            - then delete bubble element

        **************************/

        // Make a bubble container!
        let bubble = document.createElement('div');
        bubble.className = 'nutshell-bubble';
        // Subtly move down
        bubble.style.top = '-5px';
        setTimeout(()=>{ bubble.style.top = '0px'; },1);
        // RESET FONT STYLE to that of first parent node. Or document.body.
        let p = expandable.parentNode || document.body;
        let parentNodeStyle = window.getComputedStyle(p);
        bubble.style.color = parentNodeStyle.color;
        bubble.style.fontSize = parentNodeStyle.fontSize;
        bubble.style.fontStyle = parentNodeStyle.fontStyle;
        bubble.style.fontWeight = parentNodeStyle.fontWeight;
        bubble.style.lineHeight = parentNodeStyle.lineHeight;
        bubble.style.textDecoration = parentNodeStyle.textDecoration;

        // A speech-bubble arrow, positioned at X of *where you clicked*???
        let arrow = document.createElement("div");
        arrow.className = "nutshell-bubble-arrow";
        bubble.appendChild(arrow);

        // ARROW & BUBBLE COLOR. Background is background, Border is font color...
        bubble.style.borderColor = parentNodeStyle.color;
        arrow.style.borderBottomColor = parentNodeStyle.color;
        // HACK... keep bubbling up until you get a parent with a non-transparent BG color
        let bgColor = parentNodeStyle.backgroundColor,
            tryThisElementNext = p.parentNode;
            failsafe = 10;
        while(bgColor=='rgba(0, 0, 0, 0)' && tryThisElementNext && tryThisElementNext.tagName && failsafe-->0){
            bgColor = window.getComputedStyle(tryThisElementNext).backgroundColor;
            tryThisElementNext = tryThisElementNext.parentNode;
        }
        if(bgColor=='rgba(0, 0, 0, 0)'){
            bgColor = '#fff'; // worst case, default to white.
        }
        arrow.style.setProperty('--arrow-background', bgColor);
        bubble.style.background = bgColor;

        // Position the arrow, starting at 20px left of the click...
        // SO HACKY.
        {
            // (since 22px is half the arrow's width, plus border)
            let arrowX = clickX - 22;

            // What's width of the paragraph the expandable is in?
            let p = _findFirstParentWithFilter(expandable,(p)=>{
                return p.tagName=="P";
            });
            p = p ? p : document.body; // oh whatever, by default.
            let paragraphWidth = p.getBoundingClientRect().width;

            // What's the width of the container the expandable is in?
            let cont = _findFirstParentWithFilter(p,(cont)=>{
                return cont.className=='nutshell-bubble-overflow-section';
            });
            if(cont){
                let sectionWidth = cont.getBoundingClientRect().width,
                    padding = (sectionWidth-paragraphWidth)/2;
                arrowX += padding-3; // iunno, border & padding
            }

            // Don't let the arrow go past bubble's rounded corners (33px)
            if(arrowX < 33) arrowX = 33; // left
            if(arrowX > paragraphWidth-33) arrowX = paragraphWidth-33; // right

            // Finally, place that arrow.
            arrow.style.left = arrowX+"px";
        }

        // The Overflow container
        let overflow = document.createElement('div');
        overflow.className = 'nutshell-bubble-overflow';
        overflow.setAttribute("mode","opening");
        overflow.style.height = "0px"; // start closed
        bubble.appendChild(overflow);

        // Embed Button
        let embed = document.createElement('div');
        embed.className = 'nutshell-bubble-overflow-embed-button';
        embed.innerHTML = `<img src='${Nutshell._dataURIImage}'/>`;
        embed.onclick = ()=>{
            Nutshell.showEmbedModal(expandable.href, expandable.textContent);
        };
        overflow.appendChild(embed);

        // Section
        let section = document.createElement('div');
        section.className = "nutshell-bubble-overflow-section";
        overflow.appendChild(section);

        // Close Button
        let close = document.createElement('button');
        close.className = 'nutshell-bubble-overflow-close';
        close.innerHTML = '&times;';
        close.ariaLabel = "Close";
        close.onclick = ()=>{

            // Close my parent, which'll also close me
            expandable.close();

            // Then scroll to that parent expandable *if it's offscreen*
            let parentTop = expandable.getBoundingClientRect().top;
            if(parentTop<0){
                window.scrollTo({
                    top: parentTop + window.pageYOffset,
                    behavior: 'smooth'
                });
            }

        };
        overflow.appendChild(close);

        /////////////////////////
        // OPENING //////////////
        /////////////////////////

        // For "..." loading anim
        let _isSectionLoadedYet = false;

        // Get the section (using expandable's data),
        // and put it in bubble's Section Container when it loads!
        Nutshell.promiseSectionContainer(expandable).then((content)=>{

            // Links to Nutshell Expandables (yay recursion!)
            Nutshell.convertLinksToExpandables(content, expandable);

            // Put in section's content
            section.innerHTML = '';
            section.appendChild(content);

            // And animate expand for new content! Go to full height, then auto.
            overflow.style.height = section.getBoundingClientRect().height+"px";
            setTimeout(()=>{ overflow.style.height="auto"; }, ANIM_TIME);

            // Update followup text
            expandable.updateFollowupText();

            // Yes.
            _isSectionLoadedYet = true;

        });

        // While waiting to load, show "..." anim
        setTimeout(()=>{
            if(!_isSectionLoadedYet){

                // Dots: add a dot per second...
                let dots = document.createElement("p");
                dots.innerHTML = '...'; // start with 3.
                // Doing recursive setTimeout instead of "setInterval"
                // so I don't deal with figuring out how to clear an interval
                // from the above Promise with a totally different scope:
                let _addDot = ()=>{
                    if(!_isSectionLoadedYet){
                        dots.innerHTML += '.';
                        setTimeout(_addDot,1000);
                    }
                };
                _addDot();

                // Animate to height of the dots
                section.innerHTML = '';
                section.appendChild(dots);
                overflow.style.height = section.getBoundingClientRect().height+"px";

            }
        },10);

        /////////////////////////
        // CLOSING //////////////
        /////////////////////////

        // Close Animation
        bubble.close = ()=>{

            // Subtly move up
            bubble.style.top = '-5px';

            // Can't start an animation from "auto", so set height to current height
            overflow.style.height = overflow.getBoundingClientRect().height + "px";

            // NOW close it.
            setTimeout(()=>{
                overflow.setAttribute("mode","closing");
                overflow.style.height = "0px";
            },1);

            // Afterwards, delete node.
            setTimeout(()=>{
                bubble.remove();
                expandable.setAttribute("mode", "closed"); // and tell Expandable to show it, too
            }, ANIM_TIME+1);

            // Count the killed bubbles inside, subtract from Nutshell._nutshellsOpen
            Nutshell._nutshellsOpen -= bubble.querySelectorAll('.nutshell-bubble').length;
            Nutshell._updateCloseAllNutshells();

        };

        // Finally, return this magnificent created Bubble!
        return bubble;

    };

    let _findFirstParentWithFilter = (el,filter)=>{
        let original = el;
        while( el && !filter(el) ){ // first parent who passes
            el = el.parentNode;
        }
        return el; // if any
    }



    /////////////////////////////////////////////////////////////////////
    // ⭐️ Convert <h*> headings: On hover, show embed option
    /////////////////////////////////////////////////////////////////////

    Nutshell.convertHeadings = (el=document.body)=>{

        // For each heading, a container that only shows on hover!
        _getAllHeadings(el).forEach((heading)=>{

            // So it can show stuff on hover
            heading.classList.add('nutshell-heading');

            // Info needed for embed & permalink
            let headingText = heading.innerText,
                sectionID = headingText.replace(/[^A-Za-z0-9]/g,''), // bye punctuation
                permalink = Nutshell.thisPageURL+"#"+sectionID;

            // Embed button
            if(!Nutshell.options.dontEmbedHeadings){
                let embedButton = document.createElement('div');
                embedButton.className = 'nutshell-heading-embed';
                embedButton.innerHTML = `<img src='${Nutshell._dataURIImage}'/>`;
                embedButton.onclick = ()=>{
                    Nutshell.showEmbedModal(permalink, headingText);
                };
                heading.appendChild(embedButton);
            }

        });

    };

    let _getAllHeadings = (el=document.body)=>{
        let allHeadings = [];
        for(let i=0; i<HEADER_TAGS.length; i++){
            let tag = HEADER_TAGS[i];
            allHeadings = allHeadings.concat( [...el.querySelectorAll(tag)] ); // big ol' array
        }
        return allHeadings;
    }

    // If heading *begins* with ":",
    // replace it and following section with just a link!
    // (And if it starts with ":x", DELETE ENTIRELY.)
    Nutshell.hideHeadings = (el=document.body)=>{

        // Temporary dividers to remove later...
        let tmpDividers = [];

        // For each found heading with :colon...
        _getAllHeadings(el).filter((heading)=>{
            return heading.innerText.trim()[0]==":";
        }).forEach((heading)=>{

            // Unless it's ":x", in which case DO NOT ADD LINK.
            if(heading.innerText.trim().toLowerCase().slice(0,2)!=":x"){

                // Put a link before the heading
                let link = document.createElement("a");
                link.href = "#" + heading.innerText.replace(/[^A-Za-z0-9]/g,''), // A section ID
                link.innerText = ":" + heading.innerText.trim().slice(1).trim(); // remove first char
                heading.parentNode.insertBefore(link, heading);

                // And insert a <br> after the link
                let br = document.createElement("br");
                link.parentNode.insertBefore(br, link.nextSibling);

            }

            // [I'M NOT SURE WHY I PUT THIS CODE HERE, IT SEEMS TO DO NOTHING]
            // [LEAVING IT COMMENTED OUT IN CASE IT'S IMPORTANT]
            // Put a <hr> before the link,
            // so it won't be confused with a previous section.
            //let hr = document.createElement("hr");
            //link.parentNode.insertBefore(hr, link);
            //tmpDividers.push(hr);

            // Then delete every node following until next heading, hr, or end of post.
            let currentNode = heading,
                foundEndOfSection = false;
            while(!foundEndOfSection){

                // Move on to next, then destroy this one.
                // ("then", coz can't get next sibling in DOM if already dead
                let nextNode = currentNode.nextSibling;
                currentNode.parentNode.removeChild(currentNode);
                currentNode = nextNode;

                // Is there a next node at all?
                if(!nextNode){
                    // If not, FOUND END.
                    foundEndOfSection = true;
                }else{
                    // If yes, what's its tag? (if any?)
                    if(nextNode.tagName){
                        // If it's a heading or <hr>, FOUND END.
                        let currentTag = nextNode.tagName.toLowerCase();
                        if(HEADER_TAGS.indexOf(currentTag)>=0 || currentTag=='hr'){
                            foundEndOfSection = true;
                        }
                    }
                }

            }

        });

        // NOW remove all those temporary dividers
        //tmpDividers.forEach((hr)=>{
        //    hr.parentNode.removeChild(hr);
        //});

    };




    /////////////////////////////////////////////////////////////////////
    // ⭐️ THE EMBED MODAL (IT'S A BIG 'UN)
    /////////////////////////////////////////////////////////////////////

    // Create that big ol' element. Start hidden
    Nutshell.embedModal = document.createElement("div");
    let _e = Nutshell.embedModal;
    _e.className = 'nutshell-embed-modal';
    _e.setAttribute("mode","hidden");
    _e.style.display = 'none';

    // Will fill out HTML later with localized text
    _e.innerHTML = `
        <div id="nutshell-embed-modal-bg" onclick="Nutshell.closeEmbedModal();"></div>
        <div id="nutshell-embed-modal-bubble">
            <div id="nutshell-embed-modal-close" onclick="Nutshell.closeEmbedModal();">&times;</div>
            <div id="nutshell-embed-modal-overflow">
                <p id="nutshell-embed-p0"></p>
                <p id="nutshell-embed-p1"></p>
                <p id="nutshell-embed-p2"></p>
                <p id="nutshell-embed-p3"></p>
                <p id="nutshell-embed-p4"></p>
            </div>
        </div>
    `;

    // Shortcut variables because ugh this is messy code
    let _p0 = _e.querySelector("#nutshell-embed-p0"),
        _p1 = _e.querySelector("#nutshell-embed-p1"),
        _p2 = _e.querySelector("#nutshell-embed-p2"),
        _p3 = _e.querySelector("#nutshell-embed-p3"),
        _p4 = _e.querySelector("#nutshell-embed-p4");

    // When Nutshell starts, populate with text localization
    Nutshell.fillEmbedModalText = ()=>{

        // Step 0: Intro, and example Expandable
        // [DO THIS WHEN SHOW MODAL, because example needs to change each time]

        // Step 1: Code for head
        _p1.innerHTML = Nutshell.getLocalizedText("embedStep1")
            .replace(`[HEAD]`, `<span style="font-family:monospace">&lt;head&gt;</span>`)
            .replace(`[CODE]`, `<input style="width:100%" value="<script src='${Nutshell.cdn}'></script>" onclick="select()"/>`);

        // Step 2: Link
        _p2.innerHTML = Nutshell.getLocalizedText("embedStep2")
            .replace(`[LINK]`,`
                <input id="nutshell-embed-modal-link" onclick="select()"/>`);

        // Step 3: That's all, folks!
        _p3.innerHTML = Nutshell.getLocalizedText("embedStep3");

        // (Learn More)
        _p4.innerHTML = `<a href='https://ncase.me/nutshell/' target='_blank'>` +
                            Nutshell.getLocalizedText("learnMore") +
                        `</a>`;

        // Also, now that document.body exists, put it in
        document.body.appendChild(_e);

    };

    // Show Embed Modal (with what URL & linktext?)
    Nutshell.showEmbedModal = (url, linkText)=>{

        // Animate: show, then fade in.
        _e.style.display = 'block';
        setTimeout(()=>{ _e.setAttribute("mode","shown"); },1);

        // Reset Step 0's Example
        _p0.innerHTML = Nutshell.getLocalizedText("embedStep0")
            .replace(`[EXAMPLE]`,`<a href='${url}' style='font-weight:bold'>:${linkText}</a>`);
        Nutshell.convertLinksToExpandables(_p0);

        // Update Step 2's link URL
        _e.querySelector("#nutshell-embed-modal-link").value = url;

    };

    // Hide Embed Modal
    Nutshell.closeEmbedModal = ()=>{
        // Animate: fade away, then hide
        _e.setAttribute("mode","hidden");
        setTimeout(()=>{ _e.style.display='none'; },ANIM_TIME);
    };


    /////////////////////////////////////////////////////////////////////
    // ⭐️ NUTSHELL STYLE (putting css in js, so Nutshell is *one* file)
    /////////////////////////////////////////////////////////////////////

    // The tiny Nutshell icon
    Nutshell._dataURIImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAQIklEQVR4nO2d23XqyBKG/znrvDcTgZgIYCKQTgT4RCAmAjwR4BMBngjEjgDvCJAjEI5AcgSCCHQetJnxeAyqvkity/+t1S/QqKRWFVXVV4AQQgghhDjmJ983MHAUgAjA8keZ3ah3BnD6Ub4PWC4hIkIACYASQKVZSgA7AIsBySVERAjgCH3lvFWOAIIeyyVEhEL97+tKQb/6Z++TXELELADkaEdJP/+rqx7IJURMALN437RknuUSIkahVpyulPRaEo9yCRFzQPdK6rswJyEiNvCvrL7KykH7kRETwL+S+iwlmLT/yb9930AP2Zv8KI5jRFGE+Xz+t8+LokCapvj27ZuDW+tE7gzAM4Df3NwhGRMhNP9xV6tVVZZl1URZltVqtXL2T9+B3KClNiYDJoGGEiVJ0qign0mSxNo4OpKbtNjOZIAoaChQHMfaSnoljmNj4+hQbtluc5OhsYJQecIwNFbSK2EYahuHB7ns0SJ/Ip7zlOe5taLmea5tIB7kbltvddJ7FOp/yhwthzif0Ql5PMk9dtD+pIcoADEMRssPh4MzRT0cDr2X+6ONNuDYyCRYwXIKiaRrVUpZlr2X+6kcwbxkdCjUsbQohGoqrum73BulRN0NHLTwvkhHhGhhwqEvRfUlV1AOP9qaDIQQbpen9kJRfcnVKDloKL1mgRYN41p8KaovuQYlAw2lVwTQnCJiU3wpqi+5FoWhl2euyXeXS1O9KaovuQ7KDgPuIh7qxnEr1FOy520KCYIAy+USy+USURRhuVxiNru1R5sZP/0kewW1Trvj8fERp9MJr6+vTq97gwL1+/qjC2EuGZqBKACPAJ6cX1ipvxnCcrn8xxqLNvBlIB85nU44nU5I0xSn0wlvb29tiUoBrAG8tyVgyoRwvA1OEATVbrdzMsep7VCna47HY7Xb7ZyuYflRStSzGIgjnG+eFsdxdTweO1e6r5Des0/Ksqy2220VBIFLQ0nAgUZrFBx13V69hcspGy6Q3n9fSJLEaKr+jVKCU1eMCeGghyoIAqMVeF0hfY6+cTgcXBrKthUNGjHW2+4opXptGFekz9NXDodDtVgsXBjJAQPuDu6SBJaGsd1uexdK3UL6XH0nSZJKKWVrJBl4PMNNrLf6XK1WXnukTJA+2xC4JvM27xB1WE0j+UQAC+MIgqA3vVK6SJ9xSGRZ5iLsilvTtoGhYJGMh2E4OK/xEelzDpHdbmcbdk3eSBYwNA6lVLXb7XzrgDXS5x0qlt5k0oOKAQyNY+he4yPSZx4yZVla7QWGCY6VGCfk0i03h4L0ucfAbrez8SSTSdyNjWMMIdVnpM8+Fo7Ho2leMgkjMTIOpZTTbW/6hLQNxkSWZabzukZvJEdoNkoQBFWWZb7faWtI22FslGVpmrznGOmIewIDzzGWZPwW0rYYIxZG0tmho//qSM4W9UIZMYvFAkVRdLJoifhhNpvhdDohjmPdny5Rz90aBTEMwqox9VTdQ9omY8dwYdbgDx3VHghUSo065/iMtF3GjkW4pe1+dGhzTboCcILGxgpKKaRpiuVy2dpN9Y0+rEnvC+fzGVEU6a6JPwOIALSykL7NHGQPGgfRYDabIU1TLBZaPbkz1Lo2qJ4t7QVPYx3naELaPlMiyzKTwcSkbaV2xQKaxjGElX9tIW2jqWFoJL2fs6WguTXPZrPx/S68Im2nKWJwMm+JnodaWtvzuDiUcuhI22qqbDYbXSM5ulRol71YIeqd80QEQYDT6eR8K8+hwV6sZpbLpW7P1hrANxeyXRpIDo1eq+PxiCiKHIofJjSQZoqiwHK5xOVykf7kjFoXxT+4hatu3i00jGO73dI4iJj5fI79fq/zkxla2L/ZlADMO4yRthsxykdCW+V2EWIdADxIKiqlUBTF5POOjzDE0mM+n+P9Xbw5fArgPzbybEOsEELjAIDn52caB7FCM9SK4HnThyMYWlkhbT/yF5obQOQ2Cm4TYml162ZZxnlWX8AQS5/z+Yz5fK7Tq7WGYbevTYj1LK243W5pHMQZs9kMT09POj/RqvwRUw8i9h4cELwPPYg5mgOIaxh4EVMP8iSu+PRE4yCt8PwsDmIAQy9i4kEWqBdCNRIEAYqiMBAxHehB7IiiSOek3giA1rG+Jh7kUVpRM04kRBtNHRPr7hVdD6JQz3NphN5DBj2IPZpeZA6NY6h1PchaWpHeg3TF46OWY1jrVNb1IKIZu0opnM8iRzN56EHcoDEFpQDwi/S6Oh5kAeGMXU2LJsQaDZ2bQ2Npro4H2UGY5OR5zh0RhdCDuOF8PuPnn3+WVt8D+E1SUceDiCYlrlYrGgfpnNlsprOFqXiCrdRAxOHVer2WyibEKQ8PYr2fQRhmSUMsUXjF5Fwfhlhu0UjWnwH83lRJ6kFEpqlhwYS0goYOiipKDCSAMLyigRDfaOx1MEet23eR+PcYddbfCMMAfRhiuWc2m0nXijwC+ONeBYkHiSSSVqve7/pIJoKGF2lcpOTMQLiND+kLGrrYWLHJQBSE+QcNhPQFjVx4joY8pMlAIokUpRSX1JLeMJ/PoZR4D+u7ittkICKtp/cgfcNVHuLEg9B7kL6hoZPRvS+bDGQukkAPQnqG5njITZo64UWd75y9aw7HQdpBc3bvzZdwz4OIN/6lcZC+MZvNdBL1m7puffxBGFpvoE1IK7jIje8ZSCS5AL0H6Ssauhnd+sLag9BASF9xoZv3DETkn7hrIukrGroZ3frinoGIrs4xENJX2s5BCJk8DLHIaNHQzZu6fm+USjQyxQEsOzhQ2C7S9sUNW2CIRcgdaCCE3IEGQsgdaCCE3IEGQsgdaCCE3IEGQsgdaCCE3MHaQLhZNekrLnTznoGkkgucTqIToQnpHA3dTG99wRCLkDvQQAi5wz0DKSQXSNPUyY0Q4hoN3SxufWFtIISMgOLWF9YhFpN00leKorC+hnUvFrt5SV/RMJD01hfWHuT19dX2EoS0govoxsnWo2VZcumtIVxR2A5dbD0KCBN15iGkb2joZHHvSycGwq5e0jdcdPECzQYikkIPQvqGi2kmQLOBiKTQg5C+0VWIJZJyuVyc9DkT4oKiKPD+/i6tflfHmwzkHcxDyMDQ8B5nAG/3KkjGQRhmkUHx8vIirZo2VZAYSONFAK2bIqRVNP6sGys6M5DL5cLeLOKd0+mkk3+kTRUkBvIGYR6y3+8l1QhpDQ0dbMw/APlcrFRSiWEW8Y2GDooqSg1EdLH393cm68QbmuGVUwP5jtolNcIwi/hCU/dSSSXx4QkAEgDrpkpKKa4R0YCzed0xn8+lHuQFwH8lFXXWg4hc0uVyoRchnfPy8uI8vAL0DIRhFuktmr1X36SVdVcUiu7i9fWVyTrpjKIo8P37d2l1ra7WVgwEAJ6enjQvTYgZmrq216msk6RfySA8ATfLMp6j3gCTdDuKosAvv/wirg5AXBkw27ThWVzxWVyVECM0vYe2Qpp4EADIAcxFFfMc87mo6iShBzFH03ucUevsRUeG6bY/T9KK6/XaUAQh9zHwHlrGAZh7EIU6nhPt9XM8HhFFkaGocUMPYsbpdMKvv/4qrW7kPQBzD3KBRjxHL0Jc8/j4qFPdyHsAdjsrPkM4cPj+/s5uX+KM/X6vs6PnGQbJ+RXTEOvKRipcKYXT6cSE/RMMsfQ4n8+Yz+e4XMQO4QnA/0zl2e7N+weEi6kulwtDLWLNer3WMQ4r7wG4OWFKHAy+vr5ybIQYk6apzpQSoPYeRrnHFdsQ68oRQCStzBH2v2CIJcMgtDoBEHdz3cLVGYVrCBN2oHaTXDNCdHh4eNAxDkAjsrmHKwN5h0as9/b2pttNRybM09OT7jk0ewC9PLgmQ32miKgkSVJNHWlbTZXj8Shuox8lRz2Q7QRXOciVBYQ7MQJ112+appPOR5iD3MYg7wCAB9SL+5zg+pz0N2jM07pcLoiiiPkI+ZIoinSNYw+HxgG4NxCgHpRJpZVpJOQr1us13t4a93X7SAFHiXkXKAAlNGLHMAx9h7tekLbPlNhsNrp5R4U6vB8UITQfMo5j3++mc6RtMxWSJDExjk3LutwaW9BI7iJtlylgaByHlnW4dQ4wMJKyLH2/r06QtsnY2e12JsaRwWGXri8UNMdHAFSr1cr3O+sEaXuMmTiOTYyjxADzjlsE0EzaAVSLxWL0nkTaFmPFwjjCVjXWAwvQSP6BtB3GiKFxVADiVjXVIysYNEgQBFWWZb7fZytI22BMlGVZLRYLU+PYtqqhPSCGQcMopUZpJNLnHwtZltkYx65VzewRRkYCoNrtdr7fsVOkzz0GjsdjpZQyNY6kTYXsIzEMchJgXGMl0mceOobduJPzHJ8xykmAOnnP89z3e7dG+rxDpSxLm2S8wogTcilGvVtAnZcMPeSSPusQORwONvkGjeMDIQyNBKgnOg61K1j6jEOiLEvTCYc0jjsEqFeDGTWoUmqQKxSlzzcULHupaBwNBDCYlvKxhGE4qO5g6XP1nTzPq9VqZWsYoxwhd41C3aVn1dhxHA8iiZc+T18py7La7XY23bfXkmNEc6u6YAdLI1FKVdvtttf5ifRZ+kZZllWSJC4Mo0K9r9rgZ+X6IIRF8n4tfTYU6TP0BceGUWLCYxyuCGCZl1yLUqparVbV8Xj0rWd/Ir133+R5Xm23W1eGUf14pwypHLKFmxdTAfVAY5Ik3r2K9H59kOd5lSSJ7UDfVyUBQ6pWWMCRN7mWq1fxZSzS++yCsiyrw+FQxXFcBUHg2igq1CHVyq1KkK+wTuBvlTAMq91u11kPmPS+2uJwOFSbzcbF2EVTOaAOl0lHhHDsTT6XxWLRurFI78U1YRi2bRDXkoNjG17ZwEFPV1MJgqDabDbOFVUq35dci1L+eDfMNXqAguMk/lbxpai+5BqWBDSMXhLAwSj8veJLUX3J1SwJ2HU7CFozFF+K6kuusCQYaQLu+viDvhGg3g7/EfVB8tZUjo8h8HX8gVTuHa4HZO5RH6BEBs4K9ZwfehANuV+UIyY0HX3sHuQrAtRnKj4A0D65p5qmBylQe4o96C0mxQL1oKN4PMXlWpMsy8T/3L7kYqS5hZQ2DtAZEm8Afkd9XHAq+UGaiqqJ0LmWJ7kpJu4xpm4gHxEdcfXy8uJMoM61PMktnAklg2cDYdjhYu27yVkYHuQO9mAa4p4FhIqjlLKa+VuWpdG6Cg9yJ51/kH+SQ6g8prvOW27c3KXcvOW2JgNkC81/dJ3epSzLnKzI60hu3GI7k4GifTqvUqrabDZ3/9WvG6k5XK7attwcnGwIYJoDhU1sATzp/kgphYeHB8zn8799XhQFXl5ecLlc3NxdN3LXAL7Z3x0ZK60uxOp5GfypsaR9jDfUHnhhaEXExPCjpL4Mc1SnxpJu6NpIrkrqSy4h2nQVbmX4e3jjSy4h2rStrLeU1JdcQoxoYz8uyd60vuQSok0IN93AR+jF/b7kEmLEAvVmBTnkypnDfucPX3InCUfS3RCiXr47u/H9GcAJwOtI5BJCCPB/uPEpO3UgX4oAAAAASUVORK5CYII=";

    Nutshell.defaultStyle = `

    /***************************************************
    HEADERS with link / embed options
    ***************************************************/

    .nutshell-heading{
        position:relative;
    }
    .nutshell-heading-embed{

        /* Position at end of heading text */
        width: 0; /* don't force newline */
        display: inline-block;
        position: relative;
        top:0.14em; left:0;

        /* Button, reveal on hover */
        opacity:0;
        cursor: pointer;
        transition: all 0.1s ease-in-out;

    }
    .nutshell-heading-embed img{
        width:1em; height:1em;
        min-width: 1em;
        min-height: 1em; /* some deal with the devil */
    }
    .nutshell-heading:hover .nutshell-heading-embed{
        left:0.25em;
        opacity:0.33;
    }
    .nutshell-heading:hover .nutshell-heading-embed:hover{
        opacity:1;
    }

    /***************************************************
    EXPANDABLE LINKS
    ***************************************************/

    .nutshell-expandable{

        /* Boring style to fit parent */
        color: inherit;
        text-decoration: none;
        border-bottom: dotted 1.5px;

        /* So those balls work */
        position:relative;

        /* Animate opacity on hover */
        transition: opacity 0.1s ease-in-out;
        opacity: 1;

    }
    .nutshell-expandable:hover{
        color: inherit;
        opacity: 0.8;
    }
    .nutshell-expandable .nutshell-expandable-text{
        padding-left: 0.35em; /* Give balls space */
    }
    /* The balls! */
    .nutshell-ball-up, .nutshell-ball-down{

        /* Placed to the left */
        position: absolute;
        display: inline-block;
        left: 1px;

        /* They're balls */
        width: 0.15em;
        height: 0.15em;
        background: #000;
        border-radius: 1em;

        /* Animate moving up & down */
        transition: top 0.1s ease-in-out;

    }
    /* Ball animation! Depends on open/closed, hover */
    .nutshell-expandable[mode=closed] .nutshell-ball-up{            top:0.4em;  }
    .nutshell-expandable[mode=closed] .nutshell-ball-down{          top:0.7em;  }
    .nutshell-expandable[mode=closed]:hover .nutshell-ball-up{      top:0.2em;  }
    .nutshell-expandable[mode=closed]:hover .nutshell-ball-down{    top:0.9em;  }
    .nutshell-expandable[mode=open] .nutshell-ball-up{              top:0.4em;  }
    .nutshell-expandable[mode=open] .nutshell-ball-down{            top:0.7em;  }
    .nutshell-expandable[mode=open]:hover .nutshell-ball-up{        top:0.55em; }
    .nutshell-expandable[mode=open]:hover .nutshell-ball-down{      top:0.55em; }

    /* Followup! */
    .nutshell-followup{
        opacity:0.33;
    }

    /***************************************************
    BUBBLES:
    ***************************************************/

    .nutshell-bubble{

        /* Gon' stretch out */
        display: inline-block;
        width: 100%;

        /* It's nice & speech-bubble-lookin' */
        border: 1px solid black;
        /*border: 1px solid #ddd;*/
        border-radius: 20px;

        /* For the speech-bubble arrow */
        position: relative;
        margin-top: 22px;

        /* For subtle move up & down */
        position: relative;
        top: 0;
        transition: top 0.3s linear;

    }

    /* Arrow outline */
    .nutshell-bubble-arrow{
        width: 0;
        height: 0;
        border-left: 20px solid transparent;
        border-right: 20px solid transparent;
        border-bottom: 20px solid #000;
        /*border-bottom: 20px solid #ddd;*/
        position: absolute;
        top: -20px;
        pointer-events: none; /* don't block clicking */
        --arrow-background: #fff; /* css var */
    }

    /* Arrow white */
    .nutshell-bubble-arrow::after{
        content: "";
        width: 0;
        height: 0;
        border-left: 20px solid transparent;
        border-right: 20px solid transparent;
        border-bottom: 20px solid #fff; /* fallback */
        border-bottom: 20px solid var(--arrow-background); /* css var */
        position: absolute;
        top: 1.5px;
        left: -20px;
        pointer-events: none; /* don't block clicking */
    }

    /* Overflow: contains the head/section/food */
    .nutshell-bubble-overflow{
        overflow: hidden;
    }
    .nutshell-bubble-overflow[mode=opening]{
        transition: height 0.3s ease-out; /* Snap to open */
    }
    .nutshell-bubble-overflow[mode=closing]{
        transition: height 0.3s ease-in; /* Snap to close */
    }

    /* Head: Embed Button, show on hover */
    .nutshell-bubble-overflow-embed-button{
        position: absolute;
        top:5px; right:10px;
        width:1em; height:1em;
        opacity:0;
        transition: all 0.1s ease-in-out;
        cursor:pointer;
    }
    .nutshell-bubble-overflow-embed-button img{
        width:1em; height:1em;
    }
    .nutshell-bubble-overflow:hover > .nutshell-bubble-overflow-embed-button{
        right: 5px;
        opacity: 0.33;
    }
    .nutshell-bubble-overflow:hover > .nutshell-bubble-overflow-embed-button:hover{
        opacity: 1.0;
    }
    /* NO EMBEDDING IF IT'S A PREVIEW INSIDE EMBED MODAL */
    .nutshell-embed-modal .nutshell-bubble-overflow-embed-button{
        display:none;
    }

    /* Section */
    .nutshell-bubble-overflow-section{
        padding: 0 1em;
        padding-bottom: 0.5em;
        overflow: hidden; /* to capture full height, including <p>'s margins */
    }
    .nutshell-bubble-overflow-section > div{
        margin: 1em 0; /* if you people forgot to put your text in <p>'s -_- */
    }
    .nutshell-bubble-overflow-section img{
        max-width:100%; /* so it fits */
    }
    .nutshell-bubble-overflow-section video{
        max-width:100%; /* so it fits */
    }
    /* Total hack for nice styling */
    .nutshell-bubble-overflow-section img[data-float=left]{
        float: left;
        margin: 1em;
    }
    .nutshell-bubble-overflow-section img[data-float=right]{
        float: right;
        margin: 1em;
    }
    .nutshell-bubble-overflow-section iframe{
        max-width:100%; /* so it fits */
        border: 1px solid rgba(0,0,0,0.2);
    }
    .nutshell-bubble-overflow-section .nutshell-bubble{
        /* So that recursive bubbles don't get squashed too quickly */
        width: calc(100% + 2em - 6px); /* undo section's padding, minus a gap */
        position: relative;
        right: calc(1em - 2px);
    }

    /* From */
    .nutshell-bubble-from{
        font-size: 0.69em;
        /* line-height: 0.69em; */
        margin-bottom: -0.69em;
        opacity: 0.69;
    }

    /* Foot: is a close button, too. */
    .nutshell-bubble-overflow-close{

        /* A &times; sign */
        font-family: inherit;
        font-size: 1rem;
        text-align: center;

        /* Whole-width bottom */
        position:absolute;
        width:100%;
        bottom:0;
        border: 0;
        background: none;

        /* A button that gets darker. */
        cursor:pointer;
        opacity: 0.33;
        transition: opacity 0.1s ease-in-out;

    }
    .nutshell-bubble-overflow-close:hover{
        background: none;
        opacity:1;
    }

    /* Misc styling for bubbles. I am a busybody. */
    .nutshell-bubble li{
        margin-bottom: 0.5em;
    }
    .nutshell-bubble code{
        background: #ddd;
        border-radius: 5px;
        /*font-weight:100;*/
        padding: 0 5px;
    }
    .nutshell-bubble blockquote{
        /*background: #eee;*/
        margin-left: 0px;
        margin-right: 0px;
        border-left: 0.5em solid #eee;
        padding: 1px 1em 1px 1.5em;
        margin-top: 0;
    }

    /***************************************************
    EMBED MODAL
    ***************************************************/

    .nutshell-embed-modal{

        /* TAKE UP WHOLE SCREEN */
        position: fixed;
        z-index: 99999;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;

        /* Animate by fade in */
        transition: opacity 0.3s ease-in-out;
        opacity: 1;
    }
    .nutshell-embed-modal[mode=shown]{  opacity:1; }
    .nutshell-embed-modal[mode=hidden]{ opacity:0; }

    /* Background is a big transparent black */
    #nutshell-embed-modal-bg{
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
    }

    /* Bubble is a big white rounded rect */
    #nutshell-embed-modal-bubble{

        /* In the middle */
        position: absolute;
        margin: auto;
        top: 0; left: 0; right: 0; bottom: 0;
        width: 600px;
        height: 450px;

        /* Color & font */
        background: #fff;
        color: #000;
        border-radius: 30px;
        font-size: 20px;
        line-height: 1.5em;

        /* Animate by slide up */
        transition: top 0.3s ease-in-out;
    }
    .nutshell-embed-modal[mode=shown] #nutshell-embed-modal-bubble{  top:0;     }
    .nutshell-embed-modal[mode=hidden] #nutshell-embed-modal-bubble{ top:100px; }

    /* Close button */
    #nutshell-embed-modal-close{

        /* Top right button */
        z-index: 999;
        position: absolute;
        top: 5px; right: 10px;
        cursor: pointer;

        /* Just a times sign */
        font-size: 40px;
        /*font-weight: 100;*/
        height: 40px;

        /* Anim */
        opacity: 0.25;
        transition: opacity 0.1s ease-in-out;

    }
    #nutshell-embed-modal-close:hover{
        opacity:1;
    }

    /* Can scroll inside! */
    #nutshell-embed-modal-overflow{
        overflow-x: visible;
        overflow-y: scroll;
        padding: 15px 30px;
        width: calc(100% - 60px);
        height: calc(100% - 30px);
    }

    /* The "inputs" in the modal should look code-like */
    #nutshell-embed-modal-bubble input{
        width: 100%;
        font-size: 14px;
        font-family: monospace;
    }

    /* Learn More */
    #nutshell-embed-p4{
        font-size: 0.7em;
        line-height: 0em;
        text-align: center;
        margin-top: 3em;
    }

    /***************************************************
    CLOSE ALL NUTSHELLS
    ***************************************************/

    #nutshell-close-all{

        /* Top-right */
        position: fixed;
        top: 0; right: 0;

        /* Fades in & out */
        transition: opacity 0.9s ease-in-out;
        opacity: 0;
        text-align: right;
        cursor: pointer;

        /* Little text */
        font-size: 0.7em;
        line-height: 1.2em;

        /* Rounded corner */
        /*background: inherit;*/
        background: #fff;
        padding: 0.7em;
        border-radius: 0 0 0 1em;

    }
    #nutshell-close-all[show=yes]{
        opacity:1;
    }
    #nutshell-close-all[show=no]{
        opacity:0;
    }

    `;

    // I give up on hoping that CSS will be rendered
    // consistently across browsers.
    Nutshell.firefoxStyle = `
        /* Ball animation! Depends on open/closed, hover */
        .nutshell-expandable[mode=closed] .nutshell-ball-up{            top:0.2em;  }
        .nutshell-expandable[mode=closed] .nutshell-ball-down{          top:0.5em;  }
        .nutshell-expandable[mode=closed]:hover .nutshell-ball-up{      top:0.0em;  }
        .nutshell-expandable[mode=closed]:hover .nutshell-ball-down{    top:0.7em;  }
        .nutshell-expandable[mode=open] .nutshell-ball-up{              top:0.2em;  }
        .nutshell-expandable[mode=open] .nutshell-ball-down{            top:0.5em;  }
        .nutshell-expandable[mode=open]:hover .nutshell-ball-up{        top:0.35em; }
        .nutshell-expandable[mode=open]:hover .nutshell-ball-down{      top:0.35em; }
    `;


    // Add the above styles, and any custom the user may have added!
    Nutshell.addStyles = ()=>{

        // PREPENDING styles, in reverse order.
        // Prepend so that so user-made CSS can override!
        let styleEl;

        // Firefox?
        if(navigator.userAgent.indexOf("Firefox")>0){
            styleEl = document.createElement("style");
            styleEl.innerHTML = Nutshell.firefoxStyle;
            document.head.prepend(styleEl);
        }

        // Default
        styleEl = document.createElement("style");
        styleEl.innerHTML = Nutshell.defaultStyle;
        document.head.prepend(styleEl);

    };

}


/*************************************************************************

OPEN SOURCE LIBRARIES I'M PUTTING DIRECTLY INTO THIS JAVASCRIPT FILE
COZ AIN'T NOBODY WANT A REPEAT OF THE LEFT-PAD FIASCO

Included: DOMPurify, Marked

*************************************************************************/

/*! @license DOMPurify 3.4.17 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.4.17/LICENSE */
(function(e,t){typeof exports==`object`&&typeof module<`u`?module.exports=t():typeof define==`function`&&define.amd?define([],t):(e=typeof globalThis<`u`?globalThis:e||self,e.DOMPurify=t())})(this,function(){"use strict";function e(e,t){this.v=e,this.k=t}function t(e,t){(t==null||t>e.length)&&(t=e.length);for(var n=0,r=Array(t);n<t;n++)r[n]=e[n];return r}function n(e){if(Array.isArray(e))return e}function r(e,t){var n=e==null?null:typeof Symbol<`u`&&e[Symbol.iterator]||e[`@@iterator`];if(n!=null){var r,i,a,o,s=[],c=!0,l=!1;try{if(a=(n=n.call(e)).next,t===0){if(Object(n)!==n)return;c=!1}else for(;!(c=(r=a.call(n)).done)&&(s.push(r.value),s.length!==t);c=!0);}catch(e){l=!0,i=e}finally{try{if(!c&&n.return!=null&&(o=n.return(),Object(o)!==o))return}finally{if(l)throw i}}return s}}function i(){throw TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}
/*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */
function a(e,t){return n(e)||r(e,t)||o(e,t)||i()}function o(e,n){if(e){if(typeof e==`string`)return t(e,n);var r={}.toString.call(e).slice(8,-1);return r===`Object`&&e.constructor&&(r=e.constructor.name),r===`Map`||r===`Set`?Array.from(e):r===`Arguments`||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?t(e,n):void 0}}function s(t){var n,r;function i(n,r){try{var o=t[n](r),s=o.value,c=s instanceof e;Promise.resolve(c?s.v:s).then(function(e){if(c){var r=n===`return`&&s.k?n:`next`;if(!s.k||e.done)return i(r,e);e=t[r](e).value}a(!!o.done,e)},function(e){i(`throw`,e)})}catch(e){a(2,e)}}function a(e,t){e===2?n.reject(t):n.resolve({value:t,done:e}),(n=n.next)?i(n.key,n.arg):r=null}this._invoke=function(e,t){return new Promise(function(a,o){var s={key:e,arg:t,resolve:a,reject:o,next:null};r?r=r.next=s:(n=r=s,i(e,t))})},typeof t.return!=`function`&&(this.return=void 0)}s.prototype[typeof Symbol==`function`&&Symbol.asyncIterator||`@@asyncIterator`]=function(){return this},s.prototype.next=function(e){return this._invoke(`next`,e)},s.prototype.throw=function(e){return this._invoke(`throw`,e)},s.prototype.return=function(e){return this._invoke(`return`,e)};let c=Object.entries,l=Object.setPrototypeOf,u=Object.isFrozen,d=Object.getPrototypeOf,f=Object.getOwnPropertyDescriptor,p=Object.freeze,m=Object.seal,h=Object.create,ee=typeof Reflect<`u`&&Reflect,g=ee.apply,te=ee.construct;p||(p=function(e){return e}),m||(m=function(e){return e}),g||(g=function(e,t){var n=[...arguments].slice(2);return e.apply(t,n)}),te||(te=function(e){return new e(...[...arguments].slice(1))});let _=E(Array.prototype.forEach);Array.prototype.indexOf;let ne=E(Array.prototype.lastIndexOf),re=E(Array.prototype.pop),ie=E(Array.prototype.push),ae=E(Array.prototype.slice),oe=E(Array.prototype.splice),v=Array.isArray,se=D(Set),ce=E(Set.prototype.add),le=E(Set.prototype.has),y=E(String.prototype.toLowerCase),ue=E(String.prototype.toString),de=E(String.prototype.match),fe=E(String.prototype.replace),pe=E(String.prototype.indexOf),me=E(String.prototype.trim),he=E(Number.prototype.toString),b=E(Boolean.prototype.toString),x=typeof BigInt>`u`?null:E(BigInt.prototype.toString),ge=typeof Symbol>`u`?null:E(Symbol.prototype.toString),S=E(Object.prototype.hasOwnProperty),C=E(Object.prototype.toString),w=E(RegExp.prototype.test),T=D(TypeError);function E(e){return function(t){t instanceof RegExp&&(t.lastIndex=0);var n=[...arguments].slice(1);return g(e,t,n)}}function D(e){return function(){return te(e,[...arguments])}}function O(e,t){let n=arguments.length>2&&arguments[2]!==void 0?arguments[2]:y;if(l&&l(e,null),!v(t))return e;let r=t.length;for(;r--;){let i=t[r];if(typeof i==`string`){let e=n(i);e!==i&&(u(t)||(t[r]=e),i=e)}e[i]=!0}return e}function _e(e){for(let t=0;t<e.length;t++)S(e,t)||(e[t]=null);return e}function k(e){let t=h(null);for(let r of c(e)){var n=a(r,2);let i=n[0],o=n[1];S(e,i)&&(t[i]=v(o)?_e(o):o&&typeof o==`object`&&o.constructor===Object?k(o):o)}return t}function ve(e){switch(typeof e){case`string`:return e;case`number`:return he(e);case`boolean`:return b(e);case`bigint`:return x?x(e):`0`;case`symbol`:return ge?ge(e):`Symbol()`;case`undefined`:return C(e);case`function`:case`object`:{if(e===null)return C(e);let t=e,n=A(t,`toString`);if(typeof n==`function`){let e=n(t);return typeof e==`string`?e:C(e)}return C(e)}default:return C(e)}}function A(e,t){for(;e!==null;){let n=f(e,t);if(n){if(n.get)return E(n.get);if(typeof n.value==`function`)return E(n.value)}e=d(e)}function n(){return null}return n}function ye(e,t){for(;e!==null;){let n=f(e,t);if(n)return n.get?E(n.get):null;e=d(e)}return null}function be(e){try{return w(e,``),!0}catch(e){return!1}}let xe=p(/* @__PURE__ */ `a.abbr.acronym.address.area.article.aside.audio.b.bdi.bdo.big.blink.blockquote.body.br.button.canvas.caption.center.cite.code.col.colgroup.content.data.datalist.dd.decorator.del.details.dfn.dialog.dir.div.dl.dt.element.em.fieldset.figcaption.figure.font.footer.form.h1.h2.h3.h4.h5.h6.head.header.hgroup.hr.html.i.img.input.ins.kbd.label.legend.li.main.map.mark.marquee.menu.menuitem.meter.nav.nobr.ol.optgroup.option.output.p.picture.pre.progress.q.rp.rt.ruby.s.samp.search.section.select.shadow.slot.small.source.spacer.span.strike.strong.style.sub.summary.sup.table.tbody.td.template.textarea.tfoot.th.thead.time.tr.track.tt.u.ul.var.video.wbr`.split(`.`)),Se=p(/* @__PURE__ */ `svg.a.altglyph.altglyphdef.altglyphitem.animatecolor.animatemotion.animatetransform.circle.clippath.defs.desc.ellipse.enterkeyhint.exportparts.filter.font.g.glyph.glyphref.hkern.image.inputmode.line.lineargradient.marker.mask.metadata.mpath.part.path.pattern.polygon.polyline.radialgradient.rect.stop.style.switch.symbol.text.textpath.title.tref.tspan.view.vkern`.split(`.`)),Ce=p([`feBlend`,`feColorMatrix`,`feComponentTransfer`,`feComposite`,`feConvolveMatrix`,`feDiffuseLighting`,`feDisplacementMap`,`feDistantLight`,`feDropShadow`,`feFlood`,`feFuncA`,`feFuncB`,`feFuncG`,`feFuncR`,`feGaussianBlur`,`feImage`,`feMerge`,`feMergeNode`,`feMorphology`,`feOffset`,`fePointLight`,`feSpecularLighting`,`feSpotLight`,`feTile`,`feTurbulence`]),we=p([`animate`,`color-profile`,`cursor`,`discard`,`font-face`,`font-face-format`,`font-face-name`,`font-face-src`,`font-face-uri`,`foreignobject`,`hatch`,`hatchpath`,`mesh`,`meshgradient`,`meshpatch`,`meshrow`,`missing-glyph`,`script`,`set`,`solidcolor`,`unknown`,`use`]),Te=p(/* @__PURE__ */ `math.menclose.merror.mfenced.mfrac.mglyph.mi.mlabeledtr.mmultiscripts.mn.mo.mover.mpadded.mphantom.mroot.mrow.ms.mspace.msqrt.mstyle.msub.msup.msubsup.mtable.mtd.mtext.mtr.munder.munderover.mprescripts`.split(`.`)),Ee=p([`maction`,`maligngroup`,`malignmark`,`mlongdiv`,`mscarries`,`mscarry`,`msgroup`,`mstack`,`msline`,`msrow`,`semantics`,`annotation`,`annotation-xml`,`mprescripts`,`none`]),De=p([`#text`]),Oe=p(/* @__PURE__ */ `accept.action.align.alt.autocapitalize.autocomplete.autopictureinpicture.autoplay.background.bgcolor.border.capture.cellpadding.cellspacing.checked.cite.class.clear.color.cols.colspan.command.commandfor.controls.controlslist.coords.crossorigin.datetime.decoding.default.dir.disabled.disablepictureinpicture.disableremoteplayback.download.draggable.enctype.enterkeyhint.exportparts.face.for.headers.height.hidden.high.href.hreflang.id.inert.inputmode.integrity.ismap.kind.label.lang.list.loading.loop.low.max.maxlength.media.method.min.minlength.multiple.muted.name.nonce.noshade.novalidate.nowrap.open.optimum.part.pattern.placeholder.playsinline.popover.popovertarget.popovertargetaction.poster.preload.pubdate.radiogroup.readonly.rel.required.rev.reversed.role.rows.rowspan.spellcheck.scope.selected.shape.size.sizes.slot.span.srclang.start.src.srcset.step.style.summary.tabindex.title.translate.type.usemap.valign.value.width.wrap.xmlns`.split(`.`)),ke=p(/* @__PURE__ */ `accent-height.accumulate.additive.alignment-baseline.amplitude.ascent.attributename.attributetype.azimuth.basefrequency.baseline-shift.begin.bias.by.class.clip.clippathunits.clip-path.clip-rule.color.color-interpolation.color-interpolation-filters.color-profile.color-rendering.cx.cy.d.dx.dy.diffuseconstant.direction.display.divisor.dominant-baseline.dur.edgemode.elevation.end.exponent.fill.fill-opacity.fill-rule.filter.filterunits.flood-color.flood-opacity.font-family.font-size.font-size-adjust.font-stretch.font-style.font-variant.font-weight.fx.fy.g1.g2.glyph-name.glyphref.gradientunits.gradienttransform.height.href.id.image-rendering.in.in2.intercept.k.k1.k2.k3.k4.kerning.keypoints.keysplines.keytimes.lang.lengthadjust.letter-spacing.kernelmatrix.kernelunitlength.lighting-color.local.marker-end.marker-mid.marker-start.markerheight.markerunits.markerwidth.maskcontentunits.maskunits.max.mask.mask-type.media.method.mode.min.name.numoctaves.offset.operator.opacity.order.orient.orientation.origin.overflow.paint-order.path.pathlength.patterncontentunits.patterntransform.patternunits.pointer-events.points.preservealpha.preserveaspectratio.primitiveunits.r.rx.ry.radius.refx.refy.repeatcount.repeatdur.restart.result.rotate.scale.seed.shape-rendering.slope.specularconstant.specularexponent.spreadmethod.startoffset.stddeviation.stitchtiles.stop-color.stop-opacity.stroke-dasharray.stroke-dashoffset.stroke-linecap.stroke-linejoin.stroke-miterlimit.stroke-opacity.stroke.stroke-width.style.surfacescale.systemlanguage.tabindex.tablevalues.targetx.targety.transform.transform-origin.text-anchor.text-decoration.text-orientation.text-rendering.textlength.type.u1.u2.unicode.values.vector-effect.viewbox.visibility.version.vert-adv-y.vert-origin-x.vert-origin-y.width.word-spacing.wrap.writing-mode.xchannelselector.ychannelselector.x.x1.x2.xmlns.y.y1.y2.z.zoomandpan`.split(`.`)),Ae=p(/* @__PURE__ */ `accent.accentunder.align.bevelled.close.columnalign.columnlines.columnspacing.columnspan.denomalign.depth.dir.display.displaystyle.encoding.fence.frame.height.href.id.largeop.length.linethickness.lquote.lspace.mathbackground.mathcolor.mathsize.mathvariant.maxsize.minsize.movablelimits.notation.numalign.open.rowalign.rowlines.rowspacing.rowspan.rspace.rquote.scriptlevel.scriptminsize.scriptsizemultiplier.selection.separator.separators.stretchy.subscriptshift.supscriptshift.symmetric.voffset.width.xmlns`.split(`.`)),je=p([`xlink:href`,`xml:id`,`xlink:title`,`xml:space`,`xmlns:xlink`]),Me=m(/{{[\w\W]*|^[\w\W]*}}/g),Ne=m(/<%[\w\W]*|^[\w\W]*%>/g),Pe=m(/\${[\w\W]*/g),Fe=m(/^data-[\-\w.\u00B7-\uFFFF]+$/),Ie=m(/^aria-[\-\w]+$/),Le=m(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i),Re=m(/^(?:\w+script|data):/i),ze=m(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g),Be=m(/^html$/i),Ve=m(/^[a-z][.\w]*(-[.\w]+)+$/i),He=m(/<[/\w!]/g),Ue=m(/<[/\w]/g),We=m(/<\/no(script|embed|frames)/i),Ge=m(/\/>/i),j={element:1,attribute:2,text:3,cdataSection:4,entityReference:5,entityNode:6,processingInstruction:7,comment:8,document:9,documentType:10,documentFragment:11,notation:12},Ke=p(O({},[`style`,`script`,`xmp`,`iframe`,`noembed`,`noframes`,`plaintext`,`noscript`])),qe=function(){return typeof window>`u`?null:window},Je=function(e,t){if(typeof e!=`object`||typeof e.createPolicy!=`function`)return null;let n=null,r=`data-tt-policy-suffix`;t&&t.hasAttribute(r)&&(n=t.getAttribute(r));let i=`dompurify`+(n?`#`+n:``);try{return e.createPolicy(i,{createHTML(e){return e},createScriptURL(e){return e}})}catch(e){return console.warn(`TrustedTypes policy `+i+` could not be created.`),null}},Ye=function(){return{afterSanitizeAttributes:[],afterSanitizeElements:[],afterSanitizeShadowDOM:[],beforeSanitizeAttributes:[],beforeSanitizeElements:[],beforeSanitizeShadowDOM:[],uponSanitizeAttribute:[],uponSanitizeElement:[],uponSanitizeShadowNode:[]}},M=function(e,t,n,r){return S(e,t)&&v(e[t])?O(r.base?k(r.base):{},e[t],r.transform):n},Xe=function(e,t,n){let r=S(e,t)?e[t]:void 0;return r&&typeof r==`object`?k(r):n()};function Ze(){let e=arguments.length>0&&arguments[0]!==void 0?arguments[0]:qe(),t=e=>Ze(e);if(t.version=`3.4.17`,t.removed=[],!e||!e.document||e.document.nodeType!==j.document||!e.Element)return t.isSupported=!1,t;let n=e.document,r=n,i=r.currentScript;e.DocumentFragment;let a=e.HTMLTemplateElement,o=e.Node,s=e.Element,l=e.NodeFilter;e.NamedNodeMap===void 0&&(e.NamedNodeMap||e.MozNamedAttrMap),e.HTMLFormElement;let u=e.DOMParser,d=e.trustedTypes,f=s.prototype,ee=A(f,`cloneNode`),g=A(f,`remove`),te=A(f,`removeAttributeNode`),he=A(f,`nextSibling`),b=A(f,`childNodes`),x=A(f,`parentNode`),ge=A(f,`shadowRoot`),C=A(f,`attributes`),E=o&&o.prototype?A(o.prototype,`nodeType`):null,D=o&&o.prototype?A(o.prototype,`nodeName`):null,_e=o&&o.prototype?A(o.prototype,`ownerDocument`):null,N=function(e){return E?E(e):e.nodeType},Qe=function(e){return D?D(e):e.nodeName},$e=ye(f,`namespaceURI`),et=function(e){return $e?$e(e):e.namespaceURI};if(typeof a==`function`){let e=n.createElement(`template`);e.content&&e.content.ownerDocument&&(n=e.content.ownerDocument)}let P,F=``,tt,nt=!1,rt=0,it=function(){if(rt>0)throw T(`A configured TRUSTED_TYPES_POLICY callback (createHTML or createScriptURL) must not call DOMPurify.sanitize, as that causes infinite recursion. Do not pass a policy whose callbacks wrap DOMPurify as TRUSTED_TYPES_POLICY; see the "DOMPurify and Trusted Types" section of the README.`)},at=function(e){it(),rt++;try{return P.createHTML(e)}finally{rt--}},ot=function(e){it(),rt++;try{return P.createScriptURL(e)}finally{rt--}},st=function(){return nt||(tt=Je(d,i),nt=!0),tt},ct=n,lt=ct.implementation,ut=ct.createNodeIterator,dt=ct.createDocumentFragment,ft=ct.getElementsByTagName,pt=r.importNode,I=Ye();t.isSupported=typeof c==`function`&&typeof x==`function`&&lt&&lt.createHTMLDocument!==void 0;let mt=Me,ht=Ne,gt=Pe,_t=Fe,vt=Ie,yt=Re,bt=ze,xt=Ve,St=Le,L=null,Ct=O({},[...xe,...Se,...Ce,...Te,...De]),R=null,wt=O({},[...Oe,...ke,...Ae,...je]),z=Object.seal(h(null,{tagNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},attributeNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},allowCustomizedBuiltInElements:{writable:!0,configurable:!1,enumerable:!0,value:!1}})),Tt=null,Et=null,B=Object.seal(h(null,{tagCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},attributeCheck:{writable:!0,configurable:!1,enumerable:!0,value:null}})),Dt=!0,Ot=!0,kt=!1,At=!0,V=!1,H=!0,U=!1,jt=!1,Mt=null,Nt=null,Pt=!1,W=!1,Ft=!1,It=!1,Lt=!0,Rt=!1,zt=`user-content-`,Bt=!0,Vt=!1,G=null,K={},q=null,Ht=O({},/* @__PURE__ */ `annotation-xml.audio.colgroup.desc.foreignobject.head.iframe.math.mi.mn.mo.ms.mtext.noembed.noframes.noscript.plaintext.script.selectedcontent.style.svg.template.thead.title.video.xmp`.split(`.`)),Ut=null,Wt=O({},[`audio`,`video`,`img`,`source`,`image`,`track`]),Gt=null,Kt=O({},[`alt`,`class`,`for`,`id`,`label`,`name`,`pattern`,`placeholder`,`role`,`summary`,`title`,`value`,`style`,`xmlns`]),qt=`http://www.w3.org/1998/Math/MathML`,Jt=`http://www.w3.org/2000/svg`,J=`http://www.w3.org/1999/xhtml`,Yt=J,Xt=!1,Zt=null,Qt=O({},[qt,Jt,J],ue),$t=p([`mi`,`mo`,`mn`,`ms`,`mtext`]),en=O({},$t),tn=p([`annotation-xml`]),nn=O({},tn),rn=O({},[`title`,`style`,`font`,`a`,`script`]),an=null,on=[`application/xhtml+xml`,`text/html`],Y=null,sn=null,cn=n.createElement(`form`),ln=function(e){return e instanceof RegExp||e instanceof Function},un=function(){let e=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};if(sn&&sn===e)return;(!e||typeof e!=`object`)&&(e={}),e=k(e),an=on.indexOf(e.PARSER_MEDIA_TYPE)===-1?`text/html`:e.PARSER_MEDIA_TYPE,Y=an===`application/xhtml+xml`?ue:y,L=M(e,`ALLOWED_TAGS`,Ct,{transform:Y}),R=M(e,`ALLOWED_ATTR`,wt,{transform:Y}),Zt=M(e,`ALLOWED_NAMESPACES`,Qt,{transform:ue}),Gt=M(e,`ADD_URI_SAFE_ATTR`,Kt,{transform:Y,base:Kt}),Ut=M(e,`ADD_DATA_URI_TAGS`,Wt,{transform:Y,base:Wt}),q=M(e,`FORBID_CONTENTS`,Ht,{transform:Y}),Tt=M(e,`FORBID_TAGS`,k({}),{transform:Y}),Et=M(e,`FORBID_ATTR`,k({}),{transform:Y}),K=S(e,`USE_PROFILES`)?e.USE_PROFILES&&typeof e.USE_PROFILES==`object`?k(e.USE_PROFILES):e.USE_PROFILES:!1,Dt=e.ALLOW_ARIA_ATTR!==!1,Ot=e.ALLOW_DATA_ATTR!==!1,kt=e.ALLOW_UNKNOWN_PROTOCOLS||!1,At=e.ALLOW_SELF_CLOSE_IN_ATTR!==!1,V=e.SAFE_FOR_TEMPLATES||!1,H=e.SAFE_FOR_XML!==!1,U=e.WHOLE_DOCUMENT||!1,W=e.RETURN_DOM||!1,Ft=e.RETURN_DOM_FRAGMENT||!1,It=e.RETURN_TRUSTED_TYPE||!1,Pt=e.FORCE_BODY||!1,Lt=e.SANITIZE_DOM!==!1,Rt=e.SANITIZE_NAMED_PROPS||!1,Bt=e.KEEP_CONTENT!==!1,Vt=e.IN_PLACE||!1,St=be(e.ALLOWED_URI_REGEXP)?e.ALLOWED_URI_REGEXP:Le,Yt=typeof e.NAMESPACE==`string`?e.NAMESPACE:J,en=Xe(e,`MATHML_TEXT_INTEGRATION_POINTS`,()=>O({},$t)),nn=Xe(e,`HTML_INTEGRATION_POINTS`,()=>O({},tn));let t=Xe(e,`CUSTOM_ELEMENT_HANDLING`,()=>h(null));if(z=h(null),S(t,`tagNameCheck`)&&ln(t.tagNameCheck)&&(z.tagNameCheck=t.tagNameCheck),S(t,`attributeNameCheck`)&&ln(t.attributeNameCheck)&&(z.attributeNameCheck=t.attributeNameCheck),S(t,`allowCustomizedBuiltInElements`)&&typeof t.allowCustomizedBuiltInElements==`boolean`&&(z.allowCustomizedBuiltInElements=t.allowCustomizedBuiltInElements),m(z),V&&(Ot=!1),Ft&&(W=!0),K&&(L=O({},De),R=h(null),K.html===!0&&(O(L,xe),O(R,Oe)),K.svg===!0&&(O(L,Se),O(R,ke),O(R,je)),K.svgFilters===!0&&(O(L,Ce),O(R,ke),O(R,je)),K.mathMl===!0&&(O(L,Te),O(R,Ae),O(R,je))),B.tagCheck=null,B.attributeCheck=null,S(e,`ADD_TAGS`)&&(typeof e.ADD_TAGS==`function`?B.tagCheck=e.ADD_TAGS:v(e.ADD_TAGS)&&(L===Ct&&(L=k(L)),O(L,e.ADD_TAGS,Y))),S(e,`ADD_ATTR`)&&(typeof e.ADD_ATTR==`function`?B.attributeCheck=e.ADD_ATTR:v(e.ADD_ATTR)&&(R===wt&&(R=k(R)),O(R,e.ADD_ATTR,Y))),S(e,`ADD_FORBID_CONTENTS`)&&v(e.ADD_FORBID_CONTENTS)&&(q===Ht&&(q=k(q)),O(q,e.ADD_FORBID_CONTENTS,Y)),Bt&&(L[`#text`]=!0),U&&O(L,[`html`,`head`,`body`]),L.table&&(O(L,[`tbody`]),delete Tt.tbody),e.TRUSTED_TYPES_POLICY){if(typeof e.TRUSTED_TYPES_POLICY.createHTML!=`function`)throw T(`TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.`);if(typeof e.TRUSTED_TYPES_POLICY.createScriptURL!=`function`)throw T(`TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.`);let t=P;P=e.TRUSTED_TYPES_POLICY;try{F=at(``)}catch(e){throw P=t,e}}else e.TRUSTED_TYPES_POLICY===null?(P=void 0,F=``):(P===void 0&&(P=st()),P&&typeof F==`string`&&(F=at(``)));p&&p(e),sn=e},dn=O({},[...Se,...Ce,...we]),fn=O({},[...Te,...Ee]),pn=function(e,t,n){return t.namespaceURI===J?e===`svg`:t.namespaceURI===qt?e===`svg`&&(n===`annotation-xml`||en[n]):!!dn[e]},mn=function(e,t,n){return t.namespaceURI===J?e===`math`:t.namespaceURI===Jt?e===`math`&&nn[n]:!!fn[e]},hn=function(e,t,n){return t.namespaceURI===Jt&&!nn[n]||t.namespaceURI===qt&&!en[n]?!1:!fn[e]&&(rn[e]||!dn[e])},gn=function(e){let t=et(e),n=y(Qe(e)),r=x(e),i,a;return r&&N(r)===j.element?(i={namespaceURI:et(r)},a=y(Qe(r))):(i={namespaceURI:Yt},a=`template`),Zt[t]?t===Jt?pn(n,i,a):t===qt?mn(n,i,a):t===J?hn(n,i,a):!!(an===`application/xhtml+xml`&&Zt[t]):!1},X=function(e){ie(t.removed,{element:e});try{x(e).removeChild(e)}catch(t){if(g(e),!x(e))throw T(`a node selected for removal could not be detached from its tree and cannot be safely returned; refusing to sanitize in place`)}},_n=function(e,t,n){try{te(e,t)}catch(t){try{e.removeAttribute(n)}catch(e){}}},vn=function(e){Sn(e);let t=b(e);t&&_(ae(t),e=>{try{g(e)}catch(e){}});let n=N(e)===j.element?C(e):null;if(n)for(let t=n.length-1;t>=0;--t){let r=n[t],i=r&&r.name;typeof i==`string`&&_n(e,r,i)}},yn=function(e,n,r){if(!r)try{r=n.getAttributeNode(e)}catch(e){r=null}ie(t.removed,{attribute:r||null,from:n});try{r?te(n,r):n.removeAttribute(e)}catch(t){try{n.removeAttribute(e)}catch(e){}}if(e===`is`){if(W||Ft)try{X(n)}catch(e){}else try{n.setAttribute(e,``)}catch(e){}}},bn=function(e){let t=C(e);if(t)for(let n=t.length-1;n>=0;--n){let r=t[n],i=r&&r.name;typeof i!=`string`||R[Y(i)]||_n(e,r,i)}},xn=function(e,t){let n=arguments.length>2&&arguments[2]!==void 0&&arguments[2],r=[e];for(;r.length>0;){let e=r.pop();if(t(e)===!1)continue;if(n&&N(e)===j.element){let t=ge(e);Z(t)&&r.push(t)}let i=b(e);if(i)for(let e=i.length-1;e>=0;--e)r.push(i[e])}},Sn=function(e){xn(e,e=>{N(e)===j.element&&bn(e)})},Cn=function(e){let t=[];return xn(e,e=>{t.push(e)},!0),t},wn=function(e,t){let n=se();_(Cn(e),e=>{N(e)===j.element&&ce(n,e)}),_(t,e=>{N(e)===j.element&&!le(n,e)&&bn(e)})},Tn=function(e,n){let r=!1;return _(t.removed,t=>{t.element&&(r=r||t.element===e,Sn(t.element))}),wn(e,n),r},En=function(e,t){let n=G,r=null,i=()=>(r||(r=se(),_(t,e=>{ce(r,e)})),r);for(let t=0;;t++){let r=Cn(e),a=[e],o=!1;if(_(r,e=>{N(e)===j.documentFragment?ie(a,e):!o&&!le(n,e)&&(o=le(i(),e))}),!o)return;if(t>=8)throw T(`the tree kept changing during in-place sanitization; refusing to return it`);_(a,(t,n)=>{Dn(t,n>0,e,i())})}},Dn=function(e,t,n,r){let i=Mn(e),a;for(;a=i.nextNode();)le(r,a)&&!le(G,a)&&(t&&Q(I.uponSanitizeShadowNode,a,null),Hn(a,n),Yn(a,n),Z(a.content)&&Xn(a.content))},On=function(e){G&&ce(G,e)},kn=function(e,t){return H?e===`patchsrc`||e===`for`&&t!==`label`&&t!==`output`:!1},An=function(e){H&&xn(e,e=>{let t=N(e);if(t===j.processingInstruction||t===j.comment&&w(Ue,e.data)){try{g(e)}catch(e){}return!1}if(t===j.element){let t=e,n=Y(Qe(e));try{t.hasAttribute&&t.hasAttribute(`patchsrc`)&&t.removeAttribute(`patchsrc`),t.hasAttribute&&t.hasAttribute(`for`)&&kn(`for`,n)&&t.removeAttribute(`for`)}catch(e){}}return!0})},jn=function(e){let t=null,r=null;if(Pt)e=`<remove></remove>`+e;else{let t=de(e,/^[\r\n\t ]+/);r=t&&t[0]}an===`application/xhtml+xml`&&Yt===J&&(e=`<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>`+e+`</body></html>`);let i=P?at(e):e;if(Yt===J)try{t=new u().parseFromString(i,an)}catch(e){}if(!t||!t.documentElement){t=lt.createDocument(Yt,`template`,null);try{t.documentElement.innerHTML=Xt?F:i}catch(e){}}let a=t.body||t.documentElement;return e&&r&&a.insertBefore(n.createTextNode(r),a.childNodes[0]||null),Yt===J?ft.call(t,U?`html`:`body`)[0]:U?t.documentElement:a},Mn=function(e){let t=_e?_e(e):e.ownerDocument;return ut.call(t||e,e,l.SHOW_ELEMENT|l.SHOW_COMMENT|l.SHOW_TEXT|l.SHOW_PROCESSING_INSTRUCTION|l.SHOW_CDATA_SECTION,null)},Nn=function(e){return e=fe(e,mt,` `),e=fe(e,ht,` `),e=fe(e,gt,` `),e},Pn=function(e){var t;Fn(e);let n=(t=e.querySelectorAll)==null?void 0:t.call(e,`template`);n&&_(n,e=>{Z(e.content)&&Pn(e.content)})},Fn=function(e){e.normalize();let t=_e?_e(e):e.ownerDocument,n=ut.call(t||e,e,l.SHOW_TEXT|l.SHOW_COMMENT|l.SHOW_CDATA_SECTION|l.SHOW_PROCESSING_INSTRUCTION,null),r=n.nextNode();for(;r;)r.data=Nn(r.data),r=n.nextNode()},In=function(e){let t=D?D(e):null;return typeof t!=`string`||Y(t)!==`form`?!1:typeof e.nodeName!=`string`||typeof e.textContent!=`string`||typeof e.removeChild!=`function`||e.attributes!==C(e)||typeof e.removeAttribute!=`function`||typeof e.removeAttributeNode!=`function`||typeof e.getAttributeNode!=`function`||typeof e.setAttribute!=`function`||typeof e.namespaceURI!=`string`||typeof e.insertBefore!=`function`||typeof e.hasChildNodes!=`function`||e.nodeType!==E(e)||e.childNodes!==b(e)},Z=function(e){if(!E||typeof e!=`object`||!e)return!1;try{return E(e)===j.documentFragment}catch(e){return!1}},Ln=function(e){if(!E||typeof e!=`object`||!e)return!1;try{return typeof E(e)==`number`}catch(e){return!1}};function Q(e,n,r){e.length!==0&&_(e,e=>{e.call(t,n,r,sn)})}let Rn=function(e,t){return!!(H&&e.hasChildNodes()&&!Ln(e.firstElementChild)&&w(He,e.textContent)&&w(He,e.innerHTML)||H&&Ke[t]&&N(e)===j.element&&et(e)===J&&(Ln(e.firstElementChild)||typeof e.textContent==`string`&&w(He,e.textContent))||e.nodeType===j.processingInstruction||H&&e.nodeType===j.comment&&w(Ue,e.data))},zn=function(e,t){return e instanceof RegExp?w(e,t):e instanceof Function&&!!e(t,...[...arguments].slice(2))},Bn=function(e,t,n){if(!Tt[t]&&Gn(t)&&zn(z.tagNameCheck,t))return!1;if(Bt&&!q[t]&&!q[y(t)]){let t=x(e),r=b(e);if(r&&t){let i=r.length;for(let a=i-1;a>=0;--a){let i=e===n?ee(r[a],!0):r[a];t.insertBefore(i,he(e))}}}return X(e),!0},Vn=function(e,t,n,r){return e.length===0?t:t===n||t===r?k(t):t},$=function(e,t){return e===t||x(e)!==null?!1:(Vt&&Sn(e),!0)},Hn=function(e,n){if(On(e),Q(I.beforeSanitizeElements,e,null),$(e,n))return!0;if(In(e))return X(e),!0;let r=Y(Qe(e));if(L=Vn(I.uponSanitizeElement,L,Ct,Mt),Q(I.uponSanitizeElement,e,{tagName:r,allowedTags:L}),$(e,n))return!0;if(Rn(e,r))return X(e),!0;if(Tt[r]||!(B.tagCheck instanceof Function&&B.tagCheck(r))&&!L[r]){let t=Bn(e,r,n);return t===!1&&(Q(I.afterSanitizeElements,e,null),$(e,n))?!0:t}if(N(e)===j.element&&!gn(e)||(r===`noscript`||r===`noembed`||r===`noframes`)&&w(We,e.innerHTML))return X(e),!0;if(V&&e.nodeType===j.text){let n=Nn(e.textContent);e.textContent!==n&&(ie(t.removed,{element:e.cloneNode()}),e.textContent=n)}return Q(I.afterSanitizeElements,e,null),$(e,n)},Un=function(e,t,r){if(Et[t]||kn(t,e)||Lt&&(t===`id`||t===`name`)&&(r in n||r in cn))return!1;let i=R[t]||B.attributeCheck instanceof Function&&B.attributeCheck(t,e);return Ot&&w(_t,t)||Dt&&w(vt,t)?!0:i?Gt[t]||w(St,fe(r,bt,``))||(t===`src`||t===`xlink:href`||t===`href`)&&e!==`script`&&pe(r,`data:`)===0&&Ut[e]||kt&&!w(yt,fe(r,bt,``))?!0:!r:Gn(e)&&zn(z.tagNameCheck,e)&&zn(z.attributeNameCheck,t,e)||t===`is`&&z.allowCustomizedBuiltInElements&&zn(z.tagNameCheck,r)},Wn=O({},[`annotation-xml`,`color-profile`,`font-face`,`font-face-format`,`font-face-name`,`font-face-src`,`font-face-uri`,`missing-glyph`]),Gn=function(e){return!Wn[y(e)]&&w(xt,e)},Kn=function(e,t,n,r){if(P&&typeof d==`object`&&typeof d.getAttributeType==`function`&&!n)switch(d.getAttributeType(e,t)){case`TrustedHTML`:return at(r);case`TrustedScriptURL`:return ot(r)}return r},qn=function(e,t,n,r){try{return n?e.setAttributeNS(n,t,r):e.setAttribute(t,r),!In(e)||(X(e),!1)}catch(n){return yn(t,e),!1}},Jn=function(e,t){return H&&w(/((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i,t)?!0:y(e)===`attributename`&&de(t,`href`)!==null},Yn=function(e,n){if(Q(I.beforeSanitizeAttributes,e,null),$(e,n))return;let r=e.attributes;if(!r||In(e))return;R=Vn(I.uponSanitizeAttribute,R,wt,Nt);let i={attrName:``,attrValue:``,keepAttr:!0,allowedAttributes:R,forceKeepAttr:void 0},a=r.length,o=Y(e.nodeName);for(;a--;){let n=r[a],s=n.name,c=n.namespaceURI,l=n.value,u=Y(s),d=l,f=s===`value`?d:me(d),p=!1;i.attrName=u,i.attrValue=f,i.keepAttr=!0,i.forceKeepAttr=void 0,Q(I.uponSanitizeAttribute,e,i),f=i.attrValue,Rt&&(u===`id`||u===`name`)&&pe(f,zt)!==0&&(yn(s,e,n),f=zt+f,p=!0),Jn(s,f)?yn(s,e,n):i.forceKeepAttr||(i.keepAttr?!At&&w(Ge,f)?yn(s,e,n):(V&&(f=Nn(f)),Un(o,u,f)?(f=Kn(o,u,c,f),f!==d&&qn(e,s,c,f)&&p&&re(t.removed)):yn(s,e,n)):yn(s,e,n))}Q(I.afterSanitizeAttributes,e,null),$(e,n)},Xn=function(e){let t=null,n=Mn(e);for(Q(I.beforeSanitizeShadowDOM,e,null);t=n.nextNode();)if(Q(I.uponSanitizeShadowNode,t,null),Hn(t,e),Yn(t,e),Z(t.content)&&Xn(t.content),N(t)===j.element){let e=ge(t);Z(e)&&(Zn(e),Xn(e))}V&&Fn(e),Q(I.afterSanitizeShadowDOM,e,null)},Zn=function(e){let t=[{node:e,shadow:null}];for(;t.length>0;){let e=t.pop();if(e.shadow){Xn(e.shadow);continue}let n=e.node,r=N(n)===j.element,i=b(n);if(i)for(let e=i.length-1;e>=0;--e)t.push({node:i[e],shadow:null});if(r){let e=D?D(n):null;if(typeof e==`string`&&Y(e)===`template`){let e=n.content;Z(e)&&t.push({node:e,shadow:null})}}if(r){let e=ge(n);Z(e)&&t.push({node:null,shadow:e},{node:e,shadow:null})}}};return t.sanitize=function(e){let n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},i=null,a=null,o=null,s=null;if(Xt=!e,Xt&&(e=`<!-->`),typeof e!=`string`&&!Ln(e)&&(e=ve(e),typeof e!=`string`))throw T(`dirty is not a string, aborting`);if(!t.isSupported)return e;jt?(L=Mt,R=Nt):un(n),(I.uponSanitizeElement.length>0||I.uponSanitizeAttribute.length>0)&&(L=k(L)),I.uponSanitizeAttribute.length>0&&(R=k(R)),t.removed=[];let c=Vt&&typeof e!=`string`&&Ln(e),l=[],u=G;if(c){An(e);let t=Qe(e);if(typeof t==`string`){let n=Y(t);if(!L[n]||Tt[n])throw vn(e),T(`root node is forbidden and cannot be sanitized in-place`)}if(In(e))throw vn(e),T(`root node is clobbered and cannot be sanitized in-place`);l=Cn(e),G=se()}else if(Ln(e))i=jn(`<!---->`),a=i.ownerDocument.importNode(e,!0),a.nodeType===j.element&&a.nodeName===`BODY`||a.nodeName===`HTML`?i=a:i.appendChild(a),Zn(i);else{if(!W&&!V&&!U&&e.indexOf(`<`)===-1)return P&&It?at(e):e;if(i=jn(e),!i)return W?null:It?F:``}i&&Pt&&X(i.firstChild);let d=c?e:i;try{c&&Zn(e);let t=Mn(d);for(;o=t.nextNode();)Hn(o,d),Yn(o,d),Z(o.content)&&Xn(o.content);c&&En(e,l)}catch(t){throw c&&(vn(e),Tn(e,l)),t}finally{G=u}if(c){if(Tn(e,l))throw T(`a node selected for removal could not be safely returned; refusing to sanitize in place`);return V&&Pn(e),e}if(W){if(V&&Pn(i),Ft)for(s=dt.call(i.ownerDocument);i.firstChild;)s.appendChild(i.firstChild);else s=i;return(R.shadowroot||R.shadowrootmode)&&(s=pt.call(r,s,!0)),s}let f=U?i.outerHTML:i.innerHTML;return U&&L[`!doctype`]&&i.ownerDocument&&i.ownerDocument.doctype&&i.ownerDocument.doctype.name&&w(Be,i.ownerDocument.doctype.name)&&(f=`<!DOCTYPE `+i.ownerDocument.doctype.name+`>
`+f),V&&(f=Nn(f)),P&&It?at(f):f},t.setConfig=function(){let e=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};un(e),jt=!0,Mt=L,Nt=R},t.clearConfig=function(){sn=null,jt=!1,Mt=null,Nt=null,P=tt,F=``},t.isValidAttribute=function(e,t,n){sn||un({});let r=Y(e),i=Y(t);return typeof n==`string`&&(Jn(t,n)||!At&&w(Ge,n))?!1:Un(r,i,n)},t.addHook=function(e,t){typeof t==`function`&&S(I,e)&&ie(I[e],t)},t.removeHook=function(e,t){if(S(I,e)){if(t!==void 0){let n=ne(I[e],t);return n===-1?void 0:oe(I[e],n,1)[0]}return re(I[e])}},t.removeHooks=function(e){S(I,e)&&(I[e]=[])},t.removeAllHooks=function(){I=Ye()},t}return Ze()});
//# sourceMappingURL=purify.min.js.map

/**
 * marked v18.1.1 - a markdown parser
 * Copyright (c) 2018-2026, MarkedJS. (MIT License)
 * Copyright (c) 2011-2018, Christopher Jeffrey. (MIT License)
 * https://github.com/markedjs/marked
 */

/**
 * DO NOT EDIT THIS FILE
 * The code in this file is generated from files in ./src/
 */
(function(g,f){if(typeof exports=="object"&&typeof module<"u"){module.exports=f()}else if("function"==typeof define && define.amd){define("marked",f)}else {g["marked"]=f()}}(typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : this,function(){var exports={};var __exports=exports;var module={exports};
"use strict";var V=Object.defineProperty;var Me=Object.getOwnPropertyDescriptor;var Ce=Object.getOwnPropertyNames;var Ie=Object.prototype.hasOwnProperty;var Be=(a,e)=>{for(var t in e)V(a,t,{get:e[t],enumerable:!0})},De=(a,e,t,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of Ce(e))!Ie.call(a,i)&&i!==t&&V(a,i,{get:()=>e[i],enumerable:!(n=Me(e,i))||n.enumerable});return a};var qe=a=>De(V({},"__esModule",{value:!0}),a);var jt={};Be(jt,{Hooks:()=>$,Lexer:()=>T,Marked:()=>H,Parser:()=>O,Renderer:()=>_,TextRenderer:()=>A,Tokenizer:()=>S,defaults:()=>w,getDefaults:()=>M,lexer:()=>Qt,marked:()=>g,options:()=>qt,parse:()=>Gt,parseInline:()=>Ht,parser:()=>Nt,setOptions:()=>Zt,use:()=>Le,walkTokens:()=>vt});module.exports=qe(jt);function M(){return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}var w=M();function J(a){w=a}var C={exec:()=>null};function D(a){let e=[];return t=>{let n=Math.max(0,Math.min(3,t-1)),i=e[n];return i||(i=a(n),e[n]=i),i}}function h(a,e=""){let t=typeof a=="string"?a:a.source,n={replace:(i,r)=>{let o=typeof r=="string"?r:r.source;return o=o.replace(x.caret,"$1"),t=t.replace(i,o),n},getRegex:()=>new RegExp(t,e)};return n}var Ze=((a="")=>{try{return!!new RegExp("(?<=1)(?<!1)"+a)}catch{return!1}})(),x={codeRemoveIndent:/^(?: {0,3}\t| {1,4})/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,endingSpaceTabChar:/[ \t]$/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,leadingSpaceTab:/^[ \t]+/,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+) *)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\] +\S/,listReplaceTask:/^\[[ xX]\] +/,listTaskCheckbox:/\[[ xX]\]/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,numericCharacterReference:/&#(?:(\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));/,numericCharacterReferenceOrAmpersand:/&#(?:(\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:a=>new RegExp(`^( {0,3}${a})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:D(a=>new RegExp(`^ {0,${a}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`)),hrRegex:D(a=>new RegExp(`^ {0,${a}}((?:-[ 	]*){3,}|(?:_[ 	]*){3,}|(?:\\*[ 	]*){3,})(?:\\n+|$)`)),fencesBeginRegex:D(a=>new RegExp(`^ {0,${a}}(?:\`\`\`|~~~)`)),headingBeginRegex:D(a=>new RegExp(`^ {0,${a}}#`)),htmlBeginRegex:D(a=>new RegExp(`^ {0,${a}}(?:</?(?:${j})(?: +|$|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)`,"i")),blockquoteBeginRegex:D(a=>new RegExp(`^ {0,${a}}>`))},ve=/^(?:[ \t]*(?:\n|$))+/,He=/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,Ge=/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,Q=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,Ne=/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,ee=/ {0,3}(?:[*+-]|\d{1,9}[.)])/,me=/^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |fences|blockquote|heading|hr|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,xe=h(me).replace(/bull/g,ee).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}(?:\s|$)/).replace(/hr/g,/ {0,3}(?:(?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/\|table/g,"").getRegex(),Qe=h(me).replace(/bull/g,ee).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}(?:\s|$)/).replace(/hr/g,/ {0,3}(?:(?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/table/g,/ {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(),te=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table|[ \t]+\n)[^\n]+)*)/,je=/^[^\n]+/,ne=/(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/,Fe=h(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label",ne).replace("title",/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(),Ue=h(/^(bull)([ \t][^\n]*?)?(?:\n|$)/).replace(/bull/g,ee).getRegex(),j="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",re=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,Ke=h("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n*|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>[^\\n]*\\n*|$)|<![A-Z][\\s\\S]*?(?:>[^\\n]*\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>[^\\n]*\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!(?:script|pre|style|textarea)(?![a-z0-9-]))([a-z][a-z0-9-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</[a-z][a-z0-9-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))","i").replace("comment",re).replace("tag",j).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),be=a=>h(te).replace("hr",Q).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("|table","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list",a).replace("html"," {0,3}(?:</?(?:tag)(?: +|\\n|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)").replace("tag",j).getRegex(),Xe=be(/ {0,3}(?:[*+-]|1[.)])[ \t]+[^ \t\n]/),We=be(/ {0,3}(?:[*+-]|\d{1,9}[.)])(?:[ \t]|\n|$)/),Ve=h(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph",We).getRegex(),se={blockquote:Ve,code:He,def:Fe,fences:Ge,heading:Ne,hr:Q,html:Ke,lheading:xe,list:Ue,newline:ve,paragraph:Xe,table:C,text:je},ke=h("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr",Q).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("blockquote"," {0,3}>").replace("code","(?: {4}| {0,3}	)[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list"," {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html"," {0,3}(?:</?(?:tag)(?: +|\\n|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)").replace("tag",j).getRegex(),Je={...se,lheading:Qe,table:ke,paragraph:h(te).replace("hr",Q).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("table",ke).replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list"," {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]").replace("html"," {0,3}(?:</?(?:tag)(?: +|\\n|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)").replace("tag",j).getRegex()},Ye={...se,html:h(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment",re).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:C,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:h(te).replace("hr",Q).replace("heading",` *#{1,6} *[^
]`).replace("lheading",xe).replace("|table","").replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").replace("|tag","").getRegex()},et=/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,tt=/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,Re=/^( {2,}|\\)\n(?!\s*$)[ \t]*/,nt=/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,L=/[\p{P}\p{S}]/u,q=/[\s\p{P}\p{S}]/u,F=/[^\s\p{P}\p{S}]/u,rt=h(/^((?![*_])punctSpace)/,"u").replace(/punctSpace/g,q).getRegex(),st=/[\p{Pi}\p{Ps}"']/u,Te=/(?!~)[\p{P}\p{S}]/u,it=/(?!~)[\s\p{P}\p{S}]/u,ot=/(?:[^\s\p{P}\p{S}]|~)/u,at=h(/link|precode-code|html/,"g").replace("link",/\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-",Ze?"(?<!`)()":"(^^|[^`])").replace("code",/(?<b>`+)[^`]+\k<b>(?!`)/).replace("html",/<(?! )[^<>]*?>/).getRegex(),Oe=/^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/,lt=h(Oe,"u").replace(/punct/g,L).getRegex(),ut=h(Oe,"u").replace(/punct/g,Te).getRegex(),pt=/^(?:\*+(?:((?!\*)(?!openQuote)punct)|([^\s*]))?)|^_+(?:((?!_)(?!openQuote)punct)|([^\s_]))?/,ct=h(pt,"u").replace(/openQuote/g,st).replace(/punct/g,L).getRegex(),we="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",ht=h(we,"gu").replace(/notPunctSpace/g,F).replace(/punctSpace/g,q).replace(/punct/g,L).getRegex(),dt=h(we,"gu").replace(/notPunctSpace/g,ot).replace(/punctSpace/g,it).replace(/punct/g,Te).getRegex(),kt="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)[\\s](\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|(?:(?!\\*)punct|notPunctSpace)(\\*+)(?!\\*)(?=notPunctSpace)",gt=h(kt,"gu").replace(/notPunctSpace/g,F).replace(/punctSpace/g,q).replace(/punct/g,L).getRegex(),ft=h("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)","gu").replace(/notPunctSpace/g,F).replace(/punctSpace/g,q).replace(/punct/g,L).getRegex(),mt="^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)[\\s](_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)|(?:(?!_)punct|notPunctSpace)(_+)(?!_)(?=notPunctSpace)",xt=h(mt,"gu").replace(/notPunctSpace/g,F).replace(/punctSpace/g,q).replace(/punct/g,L).getRegex(),bt=h(/^~~?(?:((?!~)punct)|[^\s~])/,"u").replace(/punct/g,L).getRegex(),Rt="^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)",Tt=h(Rt,"gu").replace(/notPunctSpace/g,F).replace(/punctSpace/g,q).replace(/punct/g,L).getRegex(),Ot=h(/\\(punct)/,"gu").replace(/punct/g,L).getRegex(),wt=h(/(`+)(?:[^`]|[^`][\s\S]*?[^`])\1(?!`)|`+|\\(punct)/,"gu").replace(/punct/g,L).getRegex(),Pt=h(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme",/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email",/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),yt=h(re).replace("(?:-->|$)","-->").getRegex(),St=h("^comment|^</[a-zA-Z][a-zA-Z0-9-]*\\s*>|^<[a-zA-Z][a-zA-Z0-9-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment",yt).replace("attribute",/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),Pe=/\[(?:\\[\s\S]|[^\[\]\\])*\]/,K=h(/(?:\[(?:brackets|\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/).replace("brackets",Pe).getRegex(),_t=h(/^!?\[(label)\]\([ \t\n]*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?[ \t\n]*\)/).replace("label",K).replace("href",/<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]+|(?=\))/).replace("title",/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(),$t=h(/^!?\[(label)\]\[(ref)\]/).replace("label",K).replace("ref",ne).getRegex(),Lt=h(/^!?\[(ref)\](?:\[\])?/).replace("ref",ne).getRegex(),ge=/(?!\s*\])(?:\\[\s\S]|[^\[\]\\]){1,999}/,At=h(/(?:[^\[\]\\`]*(?:\[(?:brackets|\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\]))){0,999}?[^\[\]\\`]*?/).replace("brackets",Pe).getRegex(),zt=h("reflink|nolink(?!\\()","g").replace("reflink",h(/^!?\[(label)\]\[(ref)\]/).replace("label",At).replace("ref",ge).getRegex()).replace("nolink",h(/^!?\[(ref)\](?:\[\])?/).replace("ref",ge).getRegex()).getRegex(),fe=/[hH][tT][tT][pP][sS]?|[fF][tT][pP]/,Et=/[A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\w-])/,Mt=h(/(?:mailto:email|xmpp:email(?:\/[A-Za-z0-9@.]+)?)/).replace(/email/g,Et).getRegex(),ie={_backpedal:C,anyPunctuation:Ot,anyPunctuationOutsideCode:wt,autolink:Pt,blockSkip:at,br:Re,code:tt,del:C,delLDelim:C,delRDelim:C,emStrongLDelim:lt,emStrongRDelimAst:ht,emStrongRDelimUnd:ft,escape:et,link:_t,nolink:Lt,punctuation:rt,reflink:$t,reflinkSearch:zt,tag:St,text:nt,url:C},Ct={...ie,emStrongLDelim:ct,emStrongRDelimAst:gt,emStrongRDelimUnd:xt,link:h(/^!?\[(label)\]\((.*?)\)/).replace("label",K).getRegex(),reflink:h(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",K).getRegex()},Y={...ie,emStrongRDelimAst:dt,emStrongLDelim:ut,delLDelim:bt,delRDelim:Tt,url:h(/^emailProtocol|^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("emailProtocol",Mt).replace("protocol",fe).replace("email",/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\w-])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,text:h(/^(?:[^a-zA-Z0-9](?=emailProtocol)|(`+|~+|[^`~])(?:(?=[`~])|(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9](?=emailProtocol)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))))/).replace("protocol",fe).replace(/emailProtocol/g,/(?:mailto|xmpp):/).getRegex()},It={...Y,br:h(Re).replace("{2,}","*").getRegex(),text:h(Y.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()},U={normal:se,gfm:Je,pedantic:Ye},Z={normal:ie,gfm:Y,breaks:It,pedantic:Ct};var Bt={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},ye=a=>Bt[a];function P(a,e){if(e){if(x.escapeTest.test(a))return a.replace(x.escapeReplace,ye)}else if(x.escapeTestNoEncode.test(a))return a.replace(x.escapeReplaceNoEncode,ye);return a}function Se(a){return x.numericCharacterReference.test(a)?a.replace(x.numericCharacterReferenceOrAmpersand,(e,t,n)=>{if(t===void 0&&n===void 0)return"&amp;";let i=t===void 0?Number.parseInt(n,16):Number.parseInt(t,10);return i===0||i>1114111||i>=55296&&i<=57343?"\uFFFD":i===38?"&amp;":String.fromCodePoint(i)}):a}function oe(a){try{a=encodeURI(a).replace(x.percentDecode,"%")}catch{return null}return a}function ae(a,e){let t=a.replace(x.findPipe,(r,o,s)=>{let l=!1,u=o;for(;--u>=0&&s[u]==="\\";)l=!l;return l?"|":" |"}),n=t.split(x.splitPipe),i=0;if(n[0].trim()||n.shift(),n.length>0&&!n.at(-1)?.trim()&&n.pop(),e)if(n.length>e)n.splice(e);else for(;n.length<e;)n.push("");for(;i<n.length;i++)n[i]=n[i].trim().replace(x.slashPipe,"|");return n}function z(a,e,t){let n=a.length;if(n===0)return"";let i=0;for(;i<n;){let r=a.charAt(n-i-1);if(r===e&&!t)i++;else if(r!==e&&t)i++;else break}return a.slice(0,n-i)}function le(a){let e=a.split(`
`),t=e.length-1;for(;t>=0&&x.blankLine.test(e[t]);)t--;return e.length-t<=2?a:e.slice(0,t+1).join(`
`)}function v(a){return a.trim().toLowerCase().toUpperCase().toLowerCase()}function ue(a,e){if(a.indexOf(e[0])===-1&&a.indexOf(e[1])===-1)return-1;let t=0;for(let n=0;n<a.length;n++)if(a[n]==="\\")n++;else if(a[n]===e[0])t++;else if(a[n]===e[1]&&(t--,t<0))return n;return t>0?-2:-1}function X(a,e=0){let t=e,n="";for(let i of a)if(i==="	"){let r=4-t%4;n+=" ".repeat(r),t+=r}else n+=i,t++;return n}function _e(a,e,t,n,i){let r=e.href,o=e.title||null,s=a[1].replace(i.other.outputLinkReplace,"$1"),l=a[0].charAt(0)==="!",u=n.state.inLink,c=n.state.linkEmitted,p=n.state.inRawBlock;n.state.inLink=!0,n.state.linkEmitted=!1;let d=n.inlineTokens(s),f=n.state.linkEmitted;if(n.state.linkEmitted=c,n.state.inLink=u,!l){if(f){n.state.inRawBlock=p;return}n.state.linkEmitted=!0}return{type:l?"image":"link",raw:t,href:r,title:o,text:s,tokens:d}}function Dt(a,e,t){let n=a.match(t.other.indentCodeCompensation);if(n===null)return e;let i=n[1];return e.split(`
`).map(r=>{let o=r.match(t.other.beginningSpace);if(o===null)return r;let[s]=o;return r.slice(Math.min(s.length,i.length))}).join(`
`)}function $e(a,e,t,n){if(!e.includes("<"))return!1;for(let i=0;i<e.length;i++){if(e[i]==="\\"){i++;continue}if(e[i]==="`"){let s=n.inline.code.exec(e.slice(i));if(s){i+=s[0].length-1;continue}}if(e[i]!=="<")continue;let r=a.slice(t+i),o=n.inline.tag.exec(r)||n.inline.autolink.exec(r);if(o){if(o[0].length>e.length-i)return!0;i+=o[0].length-1}}return!1}var S=class{options;rules;lexer;constructor(e){this.options=e||w}space(e){let t=this.rules.block.newline.exec(e);if(t&&t[0].length>0)return{type:"space",raw:t[0]}}code(e){let t=this.rules.block.code.exec(e);if(t){let n=this.options.pedantic?t[0]:le(t[0]),i=n.replace(this.rules.other.codeRemoveIndent,"");return{type:"code",raw:n,codeBlockStyle:"indented",text:i}}}fences(e){let t=this.rules.block.fences.exec(e);if(t){let n=t[0],i=Dt(n,t[3]||"",this.rules);return{type:"code",raw:n,lang:t[2]?t[2].trim().replace(this.rules.inline.anyPunctuation,"$1"):t[2],text:i}}}heading(e){let t=this.rules.block.heading.exec(e);if(t){let n=t[2].trim();if(this.rules.other.endingHash.test(n)){let i=z(n,"#");(this.options.pedantic||!i||this.rules.other.endingSpaceTabChar.test(i))&&(n=i.trim())}return{type:"heading",raw:z(t[0],`
`),depth:t[1].length,text:n,tokens:this.lexer.inline(n)}}}hr(e){let t=this.rules.block.hr.exec(e);if(t)return{type:"hr",raw:z(t[0],`
`)}}blockquote(e){let t=this.rules.block.blockquote.exec(e);if(t){let n=z(t[0],`
`).split(`
`),i="",r="",o=[];for(;n.length>0;){let s=!1,l=[],u;for(u=0;u<n.length;u++)if(this.rules.other.blockquoteStart.test(n[u]))l.push(n[u]),s=!0;else if(!s)l.push(n[u]);else break;n=n.slice(u);let c=l.join(`
`),p=c.replace(this.rules.other.blockquoteSetextReplace,`
    $1`).replace(this.rules.other.blockquoteSetextReplace2,"");i=i?`${i}
${c}`:c,r=r?`${r}
${p}`:p;let d=this.lexer.state.top;if(this.lexer.state.top=!0,this.lexer.blockTokens(p,o,!0),this.lexer.state.top=d,n.length===0)break;let f=o.at(-1);if(f?.type==="code"||f?.type==="heading"||f?.type==="hr"||f?.type==="html")break;if(f?.type==="blockquote"){let k=f,y=n.join(`
`),R=k.raw+`
`+y.replace(this.rules.other.blockquoteSetextReplace2,""),m=this.blockquote(R);o[o.length-1]=m;let E=R.substring(m.raw.length).replace(/^\n/,""),b=E?E.split(`
`).length:0,G=b?n.slice(0,-b):n;G.length>0&&(i=`${i}
${G.join(`
`)}`),r=r.substring(0,r.length-k.text.length)+m.text;break}else if(f?.type==="list"){let k=f,y=k.raw+`
`+n.join(`
`),R=this.list(y);o[o.length-1]=R,i=i.substring(0,i.length-f.raw.length)+R.raw,r=r.substring(0,r.length-k.raw.length)+R.raw,n=y.substring(o.at(-1).raw.length).split(`
`);continue}}return{type:"blockquote",raw:i,tokens:o,text:r}}}list(e){let t=this.rules.block.list.exec(e);if(t){let n=e,i=()=>n.length-e.length,r=t[1].trim(),o=r.length>1,s={type:"list",raw:"",ordered:o,start:o?+r.slice(0,-1):"",loose:!1,items:[]};r=o?`\\d{1,9}\\${r.slice(-1)}`:`\\${r}`,this.options.pedantic&&(r=o?r:"[*+-]");let l=this.rules.other.listItemRegex(r),u=!1;for(;e;){let p=!1,d="";if(!(t=l.exec(e))||this.rules.block.hr.test(e))break;let f=i();e=e.substring(t[0].length);let k=t[2].split(`
`,1)[0],y=t[1].length,R=this.options.pedantic?X(k,y):k.replace(this.rules.other.leadingSpaceTab,W=>X(W,y)),m=e.split(`
`,1)[0],E=!R.trim(),b=0;if(this.options.pedantic?(b=2,d=R.trimStart()):E?b=y+1:(b=R.search(this.rules.other.nonSpaceChar),b=b>4?1:b,d=R.slice(b),b+=y),E&&this.rules.other.blankLine.test(m)&&(e=e.substring(m.length+1),p=!0),!p){let W=this.rules.other.nextBulletRegex(b),pe=this.rules.other.hrRegex(b),ce=this.rules.other.fencesBeginRegex(b),he=this.rules.other.headingBeginRegex(b),Ae=this.rules.other.htmlBeginRegex(b),ze=this.rules.other.blockquoteBeginRegex(b);for(;e;){let de=e.split(`
`,1)[0],N;if(m=de,this.options.pedantic?(m=m.replace(this.rules.other.listReplaceNesting,"  "),N=m):N=m.replace(this.rules.other.leadingSpaceTab,Ee=>X(Ee)),ce.test(m)||he.test(m)||Ae.test(m)||ze.test(m)||W.test(m)||pe.test(m))break;if(N.search(this.rules.other.nonSpaceChar)>=b||!m.trim())d+=`
`+N.slice(b);else{if(E||R.replace(this.rules.other.tabCharGlobal,"    ").search(this.rules.other.nonSpaceChar)>=4||ce.test(R)||he.test(R)||pe.test(R))break;d+=`
`+m}E=!m.trim(),e=e.substring(de.length+1),R=N.slice(b)}}let G=n.slice(f,i());s.loose||(u?s.loose=!0:this.rules.other.doubleBlankLine.test(G)&&(u=!0)),s.items.push({type:"list_item",raw:G,task:!!this.options.gfm&&this.rules.other.listIsTask.test(d),loose:!1,text:d,tokens:[]})}let c=s.items.at(-1);if(c)c.raw=c.raw.trimEnd(),c.text=c.text.trimEnd();else return;s.raw=n.slice(0,i()).trimEnd();for(let p of s.items)if(this.lexer.state.top=!1,p.tokens=this.lexer.blockTokens(p.text,[]),!s.loose){let d=p.tokens.filter(k=>k.type==="space"),f=d.length>0&&d.some(k=>this.rules.other.anyLine.test(k.raw));s.loose=f}for(let p of s.items){let d=p.tokens[0];if(p.task&&(d?.type==="text"||d?.type==="paragraph")){p.text=p.text.replace(this.rules.other.listReplaceTask,""),d.raw=d.raw.replace(this.rules.other.listReplaceTask,""),d.text=d.text.replace(this.rules.other.listReplaceTask,"");for(let k=this.lexer.inlineQueue.length-1;k>=0;k--)if(this.rules.other.listIsTask.test(this.lexer.inlineQueue[k].src)){this.lexer.inlineQueue[k].src=this.lexer.inlineQueue[k].src.replace(this.rules.other.listReplaceTask,"");break}let f=this.rules.other.listTaskCheckbox.exec(p.raw);if(f){let k={type:"checkbox",raw:f[0]+" ",checked:f[0]!=="[ ]"};p.checked=k.checked,s.loose?p.tokens[0]&&["paragraph","text"].includes(p.tokens[0].type)&&"tokens"in p.tokens[0]&&p.tokens[0].tokens?(p.tokens[0].raw=k.raw+p.tokens[0].raw,p.tokens[0].text=k.raw+p.tokens[0].text,p.tokens[0].tokens.unshift(k)):p.tokens.unshift({type:"paragraph",raw:k.raw,text:k.raw,tokens:[k]}):p.tokens.unshift(k)}}else p.task&&(p.task=!1)}if(s.loose)for(let p of s.items){p.loose=!0;for(let d of p.tokens)d.type==="text"&&(d.type="paragraph")}return s}}html(e){let t=this.rules.block.html.exec(e);if(t){let n=le(t[0]);return{type:"html",block:!0,raw:n,pre:t[1]==="pre"||t[1]==="script"||t[1]==="style",text:n}}}def(e){let t=this.rules.block.def.exec(e);if(t){if(!this.rules.other.startAngleBracket.test(t[2])&&ue(t[2],"()")!==-1)return;let n=v(t[1]).replace(this.rules.other.multipleSpaceGlobal," "),i=t[2]?t[2].replace(this.rules.other.hrefBrackets,"$1").replace(this.rules.inline.anyPunctuation,"$1"):"",r=t[3]?t[3].substring(1,t[3].length-1).replace(this.rules.inline.anyPunctuation,"$1"):t[3];return{type:"def",tag:n,raw:z(t[0],`
`),href:i,title:r}}}table(e){let t=this.rules.block.table.exec(e);if(!t||!this.rules.other.tableDelimiter.test(t[2]))return;let n=ae(t[1]),i=t[2].replace(this.rules.other.tableAlignChars,"").split("|"),r=t[3]?.trim()?t[3].replace(this.rules.other.tableRowBlankLine,"").split(`
`):[],o={type:"table",raw:z(t[0],`
`),header:[],align:[],rows:[]};if(n.length===i.length){for(let s of i)this.rules.other.tableAlignRight.test(s)?o.align.push("right"):this.rules.other.tableAlignCenter.test(s)?o.align.push("center"):this.rules.other.tableAlignLeft.test(s)?o.align.push("left"):o.align.push(null);for(let s=0;s<n.length;s++)o.header.push({text:n[s],tokens:this.lexer.inline(n[s]),header:!0,align:o.align[s]});for(let s of r)o.rows.push(ae(s,o.header.length).map((l,u)=>({text:l,tokens:this.lexer.inline(l),header:!1,align:o.align[u]})));return o}}lheading(e){let t=this.rules.block.lheading.exec(e);if(t){let n=t[1].trim();return{type:"heading",raw:z(t[0],`
`),depth:t[2].charAt(0)==="="?1:2,text:n,tokens:this.lexer.inline(n)}}}paragraph(e){let t=this.rules.block.paragraph.exec(e);if(t){let n=t[1].charAt(t[1].length-1)===`
`?t[1].slice(0,-1):t[1];return{type:"paragraph",raw:t[0],text:n,tokens:this.lexer.inline(n)}}}text(e){let t=this.rules.block.text.exec(e);if(t)return{type:"text",raw:t[0],text:t[0],tokens:this.lexer.inline(t[0])}}escape(e){let t=this.rules.inline.escape.exec(e);if(t)return{type:"escape",raw:t[0],text:t[1]}}tag(e){let t=this.rules.inline.tag.exec(e);if(t)return!this.lexer.state.inLink&&this.rules.other.startATag.test(t[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&this.rules.other.endATag.test(t[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&this.rules.other.startPreScriptTag.test(t[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&this.rules.other.endPreScriptTag.test(t[0])&&(this.lexer.state.inRawBlock=!1),{type:"html",raw:t[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,block:!1,text:t[0]}}link(e){if(this.lexer.state.linkParenPossible===!1)return;let t=this.rules.inline.link.exec(e);if(t){let n=t[0].charAt(0)==="!"?2:1;if(!this.options.pedantic&&$e(e,t[1],n,this.rules))return;let i=t[2].trim();if(!this.options.pedantic&&this.rules.other.startAngleBracket.test(i)){if(!this.rules.other.endAngleBracket.test(i))return;let s=z(i.slice(0,-1),"\\");if((i.length-s.length)%2===0)return}else{let s=ue(t[2],"()");if(s===-2)return;if(s>-1){let u=(t[0].indexOf("!")===0?5:4)+t[1].length+s;t[2]=t[2].substring(0,s),t[0]=t[0].substring(0,u).trim(),t[3]=""}}let r=t[2],o="";if(this.options.pedantic){let s=this.rules.other.pedanticHrefTitle.exec(r);s&&(r=s[1],o=s[3])}else o=t[3]?t[3].slice(1,-1):"";return r=r.trim(),this.rules.other.startAngleBracket.test(r)&&(this.options.pedantic&&!this.rules.other.endAngleBracket.test(i)?r=r.slice(1):r=r.slice(1,-1)),_e(t,{href:r&&r.replace(this.rules.inline.anyPunctuation,"$1"),title:o&&o.replace(this.rules.inline.anyPunctuation,"$1")},t[0],this.lexer,this.rules)}}reflink(e,t){let n;if((n=this.rules.inline.reflink.exec(e))||(n=this.rules.inline.nolink.exec(e))){let i=n[0].charAt(0)==="!"?2:1;if(!this.options.pedantic&&$e(e,n[1],i,this.rules))return;let r=(n[2]||n[1]).replace(this.rules.other.multipleSpaceGlobal," "),o=t[v(r)];if(!o){let s=n[0].charAt(0);return{type:"text",raw:s,text:s}}return _e(n,o,n[0],this.lexer,this.rules)}}emStrong(e,t,n=""){let i=this.rules.inline.emStrongLDelim.exec(e);if(!i||!i[1]&&!i[2]&&!i[3]&&!i[4]||i[4]&&n.match(this.rules.other.unicodeAlphaNumeric))return;if(!(i[1]||i[3]||"")||!n||this.rules.inline.punctuation.exec(n)){let o=[...i[0]].length-1,s,l,u=o,c=0,p=i[0][0],d=n===p,f=p==="*"?this.rules.inline.emStrongRDelimAst:this.rules.inline.emStrongRDelimUnd;for(f.lastIndex=0,t=t.slice(-1*e.length+o);(i=f.exec(t))!==null;){if(s=i[1]||i[2]||i[3]||i[4]||i[5]||i[6],!s)continue;if(l=[...s].length,i[3]||i[4]){u+=l;continue}else if(i[5]||i[6]){if(o%3&&!((o+l)%3)){c+=l;continue}if(d)break}if(u-=l,u>0)continue;l=Math.min(l,l+u+c);let k=[...i[0]][0].length,y=e.slice(0,o+i.index+k+l);if(Math.min(o,l)%2){let m=y.slice(1,-1);return{type:"em",raw:y,text:m,tokens:this.lexer.inlineTokens(m)}}let R=y.slice(2,-2);return{type:"strong",raw:y,text:R,tokens:this.lexer.inlineTokens(R)}}}}codespan(e){let t=this.rules.inline.code.exec(e);if(t){let n=t[2].replace(this.rules.other.newLineCharGlobal," "),i=this.rules.other.nonSpaceChar.test(n),r=this.rules.other.startingSpaceChar.test(n)&&this.rules.other.endingSpaceChar.test(n);return i&&r&&(n=n.substring(1,n.length-1)),{type:"codespan",raw:t[0],text:n}}}br(e){let t=this.rules.inline.br.exec(e);if(t)return{type:"br",raw:t[0]}}del(e,t,n=""){let i=this.rules.inline.delLDelim.exec(e);if(!i)return;if(!(i[1]||"")||!n||this.rules.inline.punctuation.exec(n)){let o=[...i[0]].length-1,s,l,u=o,c=this.rules.inline.delRDelim;for(c.lastIndex=0,t=t.slice(-1*e.length+o);(i=c.exec(t))!==null;){if(s=i[1]||i[2]||i[3]||i[4]||i[5]||i[6],!s||(l=[...s].length,l!==o))continue;if(i[3]||i[4]){u+=l;continue}if(u-=l,u>0)continue;l=Math.min(l,l+u);let p=[...i[0]][0].length,d=e.slice(0,o+i.index+p+l),f=d.slice(o,-o);return{type:"del",raw:d,text:f,tokens:this.lexer.inlineTokens(f)}}}}autolink(e){let t=this.rules.inline.autolink.exec(e);if(t){let n,i;return t[2]==="@"?(n=t[1],i="mailto:"+n):(n=t[1],i=n),{type:"link",raw:t[0],text:n,href:i,autolink:!0,tokens:[{type:"text",raw:n,text:n}]}}}url(e){let t;if(t=this.rules.inline.url.exec(e)){let n,i;if(t[2]==="@")n=t[0],i="mailto:"+n;else{let r;do r=t[0],t[0]=this.rules.inline._backpedal.exec(t[0])?.[0]??"";while(r!==t[0]);n=t[0],t[1]==="www."?i="http://"+t[0]:i=t[0]}return{type:"link",raw:t[0],text:n,href:i,autolink:!0,tokens:[{type:"text",raw:n,text:n}]}}}inlineText(e){let t=this.rules.inline.text.exec(e);if(t){let n=this.lexer.state.inRawBlock;return{type:"text",raw:t[0],text:n?t[0]:Se(t[0]),escaped:n}}}};var T=class a{tokens;options;state;inlineQueue;tokenizer;constructor(e){this.tokens=[],this.tokens.links=Object.create(null),this.options=e||w,this.options.tokenizer=this.options.tokenizer||new S,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,this.tokenizer.lexer=this,this.inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,linkEmitted:!1,linkParenPossible:!0,top:!0};let t={other:x,block:U.normal,inline:Z.normal};this.options.pedantic?(t.block=U.pedantic,t.inline=Z.pedantic):this.options.gfm&&(t.block=U.gfm,this.options.breaks?t.inline=Z.breaks:t.inline=Z.gfm),this.tokenizer.rules=t}static get rules(){return{block:U,inline:Z}}static lex(e,t){return new a(t).lex(e)}static lexInline(e,t){return new a(t).inlineTokens(e)}lex(e){e=e.replace(x.carriageReturn,`
`),this.blockTokens(e,this.tokens);for(let t=0;t<this.inlineQueue.length;t++){let n=this.inlineQueue[t];this.inlineTokens(n.src,n.tokens)}return this.inlineQueue=[],this.tokens}blockTokens(e,t=[],n=!1){this.tokenizer.lexer=this,this.options.pedantic&&(e=e.replace(x.tabCharGlobal,"    ").replace(x.spaceLine,""));let i=1/0;for(;e;){if(e.length<i)i=e.length;else{this.infiniteLoopError(e.charCodeAt(0));break}let r;if(this.options.extensions?.block?.some(s=>(r=s.call({lexer:this},e,t))?(e=e.substring(r.raw.length),t.push(r),!0):!1))continue;if(r=this.tokenizer.space(e)){e=e.substring(r.raw.length);let s=t.at(-1);r.raw.length===1&&s!==void 0?s.raw+=`
`:t.push(r);continue}if(r=this.tokenizer.code(e)){e=e.substring(r.raw.length);let s=t.at(-1);s?.type==="paragraph"||s?.type==="text"?(s.raw+=(s.raw.endsWith(`
`)?"":`
`)+r.raw,s.text+=`
`+r.text,this.inlineQueue.at(-1).src=s.text):t.push(r);continue}if(r=this.tokenizer.fences(e)){e=e.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.heading(e)){e=e.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.hr(e)){e=e.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.blockquote(e)){e=e.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.list(e)){e=e.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.html(e)){e=e.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.def(e)){e=e.substring(r.raw.length);let s=t.at(-1);s?.type==="paragraph"||s?.type==="text"?(s.raw+=(s.raw.endsWith(`
`)?"":`
`)+r.raw,s.text+=`
`+r.raw,this.inlineQueue.at(-1).src=s.text):this.tokens.links[r.tag]||(this.tokens.links[r.tag]={href:r.href,title:r.title},t.push(r));continue}if(r=this.tokenizer.table(e)){e=e.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.lheading(e)){e=e.substring(r.raw.length),t.push(r);continue}let o=e;if(this.options.extensions?.startBlock){let s=1/0,l=e.slice(1),u;this.options.extensions.startBlock.forEach(c=>{u=c.call({lexer:this},l),typeof u=="number"&&u>=0&&(s=Math.min(s,u))}),s<1/0&&s>=0&&(o=e.substring(0,s+1))}if(this.state.top&&(r=this.tokenizer.paragraph(o))){let s=t.at(-1);n&&s?.type==="paragraph"?(s.raw+=(s.raw.endsWith(`
`)?"":`
`)+r.raw,s.text+=`
`+r.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=s.text):t.push(r),n=o.length!==e.length,e=e.substring(r.raw.length);continue}if(r=this.tokenizer.text(e)){e=e.substring(r.raw.length);let s=t.at(-1);s?.type==="text"?(s.raw+=(s.raw.endsWith(`
`)?"":`
`)+r.raw,s.text+=`
`+r.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=s.text):t.push(r);continue}if(e){this.infiniteLoopError(e.charCodeAt(0));break}}return this.state.top=!0,t}inline(e,t=[]){return this.inlineQueue.push({src:e,tokens:t}),t}linkInText(e){if(!e.includes("["))return!1;let t=this.tokenizer.rules.inline.link;for(let n of e.matchAll(this.tokenizer.rules.inline.blockSkip))if(t.test(n[0])&&e.charAt(n.index-1)!=="!")return!0;for(let n of e.matchAll(this.tokenizer.rules.inline.reflinkSearch)){let i=n[0],r=i.lastIndexOf("[");if(!(i.charAt(0)==="!"||!Object.hasOwn(this.tokens.links,v(i.slice(r+1,-1))))&&!(r>1&&this.linkInText(i.slice(1,r-1))))return!0}return!1}inlineTokens(e,t=[]){this.tokenizer.lexer=this;let n=this.state.linkParenPossible;this.state.linkParenPossible=n&&e.includes(")");try{return this.#e(e,t)}finally{this.state.linkParenPossible=n}}#e(e,t){let n=e;if(this.tokens.links&&e.includes("[")){let s=this.tokenizer.rules.inline.reflinkSearch,l=u=>{let c=u.lastIndexOf("[");if(!Object.hasOwn(this.tokens.links,v(u.slice(c+1,-1))))return u;if(c>1&&u.charAt(0)!=="!"){let p=u.slice(1,c-1);if(this.linkInText(p))return"["+p.replace(s,l)+"]["+"a".repeat(u.length-c-2)+"]"}return"["+"a".repeat(u.length-2)+"]"};n=n.replace(s,l)}n=n.replace(this.tokenizer.rules.inline.anyPunctuationOutsideCode,(s,l,u)=>u?"+".repeat(s.length):l?l+s.slice(l.length,-l.length).replace(/`/g,"+")+l:s),n=n.replace(this.tokenizer.rules.inline.blockSkip,(s,l,u)=>{let c=u?u.length:0;return s.slice(0,c)+"["+"a".repeat(s.length-c-2)+"]"}),n=this.options.hooks?.emStrongMask?.call({lexer:this},n)??n;let i=!1,r="",o=1/0;for(;e;){if(e.length<o)o=e.length;else{this.infiniteLoopError(e.charCodeAt(0));break}i||(r=""),i=!1;let s;if(this.options.extensions?.inline?.some(u=>(s=u.call({lexer:this},e,t))?(e=e.substring(s.raw.length),t.push(s),!0):!1))continue;if(s=this.tokenizer.escape(e)){e=e.substring(s.raw.length),t.push(s);continue}if(s=this.tokenizer.tag(e)){e=e.substring(s.raw.length),t.push(s);continue}if(s=this.tokenizer.link(e)){e=e.substring(s.raw.length),t.push(s);continue}if(s=this.tokenizer.reflink(e,this.tokens.links)){e=e.substring(s.raw.length);let u=t.at(-1);s.type==="text"&&u?.type==="text"?(u.raw+=s.raw,u.text+=s.text):t.push(s);continue}if(s=this.tokenizer.emStrong(e,n,r)){e=e.substring(s.raw.length),t.push(s);continue}if(s=this.tokenizer.codespan(e)){e=e.substring(s.raw.length),t.push(s);continue}if(s=this.tokenizer.br(e)){e=e.substring(s.raw.length),t.push(s);continue}if(s=this.tokenizer.del(e,n,r)){e=e.substring(s.raw.length),t.push(s);continue}if(s=this.tokenizer.autolink(e)){e=e.substring(s.raw.length),t.push(s);continue}if(!this.state.inLink&&(s=this.tokenizer.url(e))){e=e.substring(s.raw.length),t.push(s);continue}let l=e;if(this.options.extensions?.startInline){let u=1/0,c=e.slice(1),p;this.options.extensions.startInline.forEach(d=>{p=d.call({lexer:this},c),typeof p=="number"&&p>=0&&(u=Math.min(u,p))}),u<1/0&&u>=0&&(l=e.substring(0,u+1))}if(s=this.tokenizer.inlineText(l)){e=e.substring(s.raw.length),s.raw.slice(-1)!=="_"&&(r=s.raw.slice(-1)),i=!0;let u=t.at(-1);u?.type==="text"?(u.raw+=s.raw,u.text+=s.text):t.push(s);continue}if(e){this.infiniteLoopError(e.charCodeAt(0));break}}return t}infiniteLoopError(e){let t="Infinite loop on byte: "+e;if(this.options.silent)console.error(t);else throw new Error(t)}};var _=class{options;parser;constructor(e){this.options=e||w}space(e){return""}code({text:e,lang:t,escaped:n}){let i=(t||"").match(x.notSpaceStart)?.[0],r=e?e.replace(x.endingNewline,"")+`
`:"";return i?'<pre><code class="language-'+P(i)+'">'+(n?r:P(r,!0))+`</code></pre>
`:"<pre><code>"+(n?r:P(r,!0))+`</code></pre>
`}blockquote({tokens:e}){return`<blockquote>
${this.parser.parse(e)}</blockquote>
`}html({text:e}){return e}def(e){return""}heading({tokens:e,depth:t}){return`<h${t}>${this.parser.parseInline(e)}</h${t}>
`}hr(e){return`<hr>
`}list(e){let t=e.ordered,n=e.start,i="";for(let s=0;s<e.items.length;s++){let l=e.items[s];i+=this.listitem(l)}let r=t?"ol":"ul",o=t&&n!==1?' start="'+n+'"':"";return"<"+r+o+`>
`+i+"</"+r+`>
`}listitem(e){return`<li>${this.parser.parse(e.tokens)}</li>
`}checkbox({checked:e}){return"<input "+(e?'checked="" ':"")+'disabled="" type="checkbox"> '}paragraph({tokens:e}){return`<p>${this.parser.parseInline(e)}</p>
`}table(e){let t="",n="";for(let r=0;r<e.header.length;r++)n+=this.tablecell(e.header[r]);t+=this.tablerow({text:n});let i="";for(let r=0;r<e.rows.length;r++){let o=e.rows[r];n="";for(let s=0;s<o.length;s++)n+=this.tablecell(o[s]);i+=this.tablerow({text:n})}return i&&(i=`<tbody>${i}</tbody>`),`<table>
<thead>
`+t+`</thead>
`+i+`</table>
`}tablerow({text:e}){return`<tr>
${e}</tr>
`}tablecell(e){let t=this.parser.parseInline(e.tokens),n=e.header?"th":"td";return(e.align?`<${n} align="${e.align}">`:`<${n}>`)+t+`</${n}>
`}strong({tokens:e}){return`<strong>${this.parser.parseInline(e)}</strong>`}em({tokens:e}){return`<em>${this.parser.parseInline(e)}</em>`}codespan({text:e}){return`<code>${P(e,!0)}</code>`}br(e){return"<br>"}del({tokens:e}){return`<del>${this.parser.parseInline(e)}</del>`}link({href:e,title:t,text:n,tokens:i,autolink:r}){let o=r?P(n,!0):this.parser.parseInline(i),s=oe(e);if(s===null)return o;e=P(s,r);let l='<a href="'+e+'"';return t&&(l+=' title="'+P(t)+'"'),l+=">"+o+"</a>",l}image({href:e,title:t,text:n,tokens:i}){i&&(n=this.parser.parseInline(i,this.parser.textRenderer));let r=oe(e);if(r===null)return P(n);e=r;let o=`<img src="${P(e)}" alt="${P(n)}"`;return t&&(o+=` title="${P(t)}"`),o+=">",o}text(e){return"tokens"in e&&e.tokens?this.parser.parseInline(e.tokens):"escaped"in e&&e.escaped?e.text:P(e.text)}};var A=class{strong({text:e}){return e}em({text:e}){return e}codespan({text:e}){return e}del({text:e}){return e}html({text:e}){return e}text({text:e}){return e}link({text:e}){return""+e}image({text:e}){return""+e}br(){return""}checkbox({raw:e}){return e}};var O=class a{options;renderer;textRenderer;constructor(e){this.options=e||w,this.options.renderer=this.options.renderer||new _,this.renderer=this.options.renderer,this.renderer.options=this.options,this.renderer.parser=this,this.textRenderer=new A}static parse(e,t){return new a(t).parse(e)}static parseInline(e,t){return new a(t).parseInline(e)}parse(e){this.renderer.parser=this;let t="";for(let n=0;n<e.length;n++){let i=e[n];if(this.options.extensions?.renderers?.[i.type]){let o=i,s=this.options.extensions.renderers[o.type].call({parser:this},o);if(s!==!1||!["space","hr","heading","code","table","blockquote","list","checkbox","html","def","paragraph","text"].includes(o.type)){t+=s||"";continue}}let r=i;switch(r.type){case"space":{t+=this.renderer.space(r);break}case"hr":{t+=this.renderer.hr(r);break}case"heading":{t+=this.renderer.heading(r);break}case"code":{t+=this.renderer.code(r);break}case"table":{t+=this.renderer.table(r);break}case"blockquote":{t+=this.renderer.blockquote(r);break}case"list":{t+=this.renderer.list(r);break}case"checkbox":{t+=this.renderer.checkbox(r);break}case"html":{t+=this.renderer.html(r);break}case"def":{t+=this.renderer.def(r);break}case"paragraph":{t+=this.renderer.paragraph(r);break}case"text":{t+=this.renderer.text(r);break}default:{let o='Token with "'+r.type+'" type was not found.';if(this.options.silent)return console.error(o),"";throw new Error(o)}}}return t}parseInline(e,t=this.renderer){this.renderer.parser=this;let n="";for(let i=0;i<e.length;i++){let r=e[i];if(this.options.extensions?.renderers?.[r.type]){let s=this.options.extensions.renderers[r.type].call({parser:this},r);if(s!==!1||!["escape","html","link","image","checkbox","strong","em","codespan","br","del","text"].includes(r.type)){n+=s||"";continue}}let o=r;switch(o.type){case"escape":{n+=t.text(o);break}case"html":{n+=t.html(o);break}case"link":{n+=t.link(o);break}case"image":{n+=t.image(o);break}case"checkbox":{n+=t.checkbox(o);break}case"strong":{n+=t.strong(o);break}case"em":{n+=t.em(o);break}case"codespan":{n+=t.codespan(o);break}case"br":{n+=t.br(o);break}case"del":{n+=t.del(o);break}case"text":{n+=t.text(o);break}default:{let s='Token with "'+o.type+'" type was not found.';if(this.options.silent)return console.error(s),"";throw new Error(s)}}}return n}};var $=class{options;block;constructor(e){this.options=e||w}static passThroughHooks=new Set(["preprocess","postprocess","processAllTokens","emStrongMask"]);static passThroughHooksRespectAsync=new Set(["preprocess","postprocess","processAllTokens"]);preprocess(e){return e}postprocess(e){return e}processAllTokens(e){return e}emStrongMask(e){return e}provideLexer(e=this.block){return e?T.lex:T.lexInline}provideParser(e=this.block){return e?O.parse:O.parseInline}};function I(a,e){if(Array.isArray(e))for(let t=0;t<e.length;t++)a.push(e[t]);else a.push(e)}var H=class{defaults=M();options=this.setOptions;parse=this.parseMarkdown(!0);parseInline=this.parseMarkdown(!1);Parser=O;Renderer=_;TextRenderer=A;Lexer=T;Tokenizer=S;Hooks=$;constructor(...e){this.use(...e)}walkTokens(e,t){let n=[];for(let i of e)switch(I(n,t.call(this,i)),i.type){case"table":{let r=i;for(let o of r.header)I(n,this.walkTokens(o.tokens,t));for(let o of r.rows)for(let s of o)I(n,this.walkTokens(s.tokens,t));break}case"list":{let r=i;I(n,this.walkTokens(r.items,t));break}default:{let r=i;this.defaults.extensions?.childTokens?.[r.type]?this.defaults.extensions.childTokens[r.type].forEach(o=>{let s=r[o].flat(1/0);I(n,this.walkTokens(s,t))}):r.tokens&&I(n,this.walkTokens(r.tokens,t))}}return n}use(...e){let t=this.defaults.extensions||{renderers:{},childTokens:{}};return e.forEach(n=>{let i={...n};if(i.async=this.defaults.async||i.async||!1,n.extensions&&(n.extensions.forEach(r=>{if(!r.name)throw new Error("extension name required");if("renderer"in r){let o=t.renderers[r.name];o?t.renderers[r.name]=function(...s){let l=r.renderer.apply(this,s);return l===!1&&(l=o.apply(this,s)),l}:t.renderers[r.name]=r.renderer}if("tokenizer"in r){if(!r.level||r.level!=="block"&&r.level!=="inline")throw new Error("extension level must be 'block' or 'inline'");let o=t[r.level];o?o.unshift(r.tokenizer):t[r.level]=[r.tokenizer],r.start&&(r.level==="block"?t.startBlock?t.startBlock.push(r.start):t.startBlock=[r.start]:r.level==="inline"&&(t.startInline?t.startInline.push(r.start):t.startInline=[r.start]))}"childTokens"in r&&r.childTokens&&(t.childTokens[r.name]=r.childTokens)}),i.extensions=t),n.renderer){let r=this.defaults.renderer||new _(this.defaults);for(let o in n.renderer){if(!(o in r))throw new Error(`renderer '${o}' does not exist`);if(["options","parser"].includes(o))continue;let s=o,l=n.renderer[s],u=r[s];r[s]=(...c)=>{let p=l.apply(r,c);return p===!1&&(p=u.apply(r,c)),p||""}}i.renderer=r}if(n.tokenizer){let r=this.defaults.tokenizer||new S(this.defaults);for(let o in n.tokenizer){if(!(o in r))throw new Error(`tokenizer '${o}' does not exist`);if(["options","rules","lexer"].includes(o))continue;let s=o,l=n.tokenizer[s],u=r[s];r[s]=(...c)=>{let p=l.apply(r,c);return p===!1&&(p=u.apply(r,c)),p}}i.tokenizer=r}if(n.hooks){let r=this.defaults.hooks||new $;for(let o in n.hooks){if(!(o in r))throw new Error(`hook '${o}' does not exist`);if(["options","block"].includes(o))continue;let s=o,l=n.hooks[s],u=r[s];$.passThroughHooks.has(o)?r[s]=c=>{if(this.defaults.async&&$.passThroughHooksRespectAsync.has(o))return(async()=>{let d=await l.call(r,c);return u.call(r,d)})();let p=l.call(r,c);return u.call(r,p)}:r[s]=(...c)=>{if(this.defaults.async)return(async()=>{let d=await l.apply(r,c);return d===!1&&(d=await u.apply(r,c)),d})();let p=l.apply(r,c);return p===!1&&(p=u.apply(r,c)),p}}i.hooks=r}if(n.walkTokens){let r=this.defaults.walkTokens,o=n.walkTokens;i.walkTokens=function(s){let l=[];return l.push(o.call(this,s)),r&&I(l,r.call(this,s)),l}}this.defaults={...this.defaults,...i}}),this}setOptions(e){return this.defaults={...this.defaults,...e},this}lexer(e,t){return T.lex(e,t??this.defaults)}parser(e,t){return O.parse(e,t??this.defaults)}parseMarkdown(e){return(n,i)=>{let r={...i},o={...this.defaults,...r},s=this.onError(!!o.silent,!!o.async);if(this.defaults.async===!0&&r.async===!1)return s(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));if(typeof n>"u"||n===null)return s(new Error("marked(): input parameter is undefined or null"));if(typeof n!="string")return s(new Error("marked(): input parameter is of type "+Object.prototype.toString.call(n)+", string expected"));if(o.hooks&&(o.hooks.options=o,o.hooks.block=e),o.async)return(async()=>{let l=o.hooks?await o.hooks.preprocess(n):n,c=await(o.hooks?await o.hooks.provideLexer(e):e?T.lex:T.lexInline)(l,o),p=o.hooks?await o.hooks.processAllTokens(c):c;o.walkTokens&&await Promise.all(this.walkTokens(p,o.walkTokens));let f=await(o.hooks?await o.hooks.provideParser(e):e?O.parse:O.parseInline)(p,o);return o.hooks?await o.hooks.postprocess(f):f})().catch(s);try{o.hooks&&(n=o.hooks.preprocess(n));let u=(o.hooks?o.hooks.provideLexer(e):e?T.lex:T.lexInline)(n,o);o.hooks&&(u=o.hooks.processAllTokens(u)),o.walkTokens&&this.walkTokens(u,o.walkTokens);let p=(o.hooks?o.hooks.provideParser(e):e?O.parse:O.parseInline)(u,o);return o.hooks&&(p=o.hooks.postprocess(p)),p}catch(l){return s(l)}}}onError(e,t){return n=>{if(n.message+=`
Please report this to https://github.com/markedjs/marked.`,e){let i="<p>An error occurred:</p><pre>"+P(n.message+"",!0)+"</pre>";return t?Promise.resolve(i):i}if(t)return Promise.reject(n);throw n}}};var B=new H;function g(a,e){return B.parse(a,e)}g.options=g.setOptions=function(a){return B.setOptions(a),g.defaults=B.defaults,J(g.defaults),g};g.getDefaults=M;g.defaults=w;function Le(...a){return B.use(...a),g.defaults=B.defaults,J(g.defaults),g}g.use=Le;g.walkTokens=function(a,e){return B.walkTokens(a,e)};g.parseInline=B.parseInline;g.Parser=O;g.parser=O.parse;g.Renderer=_;g.TextRenderer=A;g.Lexer=T;g.lexer=T.lex;g.Tokenizer=S;g.Hooks=$;g.parse=g;var qt=g.options,Zt=g.setOptions,vt=g.walkTokens,Ht=g.parseInline,Gt=g,Nt=O.parse,Qt=T.lex;

if(__exports != exports)module.exports = exports;return module.exports}));
//# sourceMappingURL=marked.umd.js.map
