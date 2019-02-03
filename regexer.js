/**
 * @package RegExer
 * @version 1.2
 *
 * @author m13p4
 * @copyright Pavel Meliantchenkov
 */

var RegExer = function(appendToElem)
{
    // Parameter & Elements
    var VERSION = "1.2",
        parentElem, 
        regexInputWrapperElem,
        regexInputElem,
        regexInputHighlightElem,
        regexOutputWrapperElem,
        regexOutputTextElem,
        regexOutputHighlightElem,
        regularExpression,
        regularExpressionParser,
        regexOutputReplaceElem,
        regexInputReplaceElem,
        
        regexControllArea,
        regexControllButtonMatch,
        regexControllButtonReplace,
        
        regexControllModifierArea,
        regexControllModifier_I,
        regexControllModifier_G,
        regexControllModifier_M,
        
        modifier_I_title = "Perform case-insensitive matching",
        modifier_G_title = "Perform a global match (find all matches rather than stopping after the first match)",
        modifier_M_title = "Perform multiline matching",
        
        modifier_I = false, 
        modifier_G = true, 
        modifier_M = false,
        
        regexGroups = [],
        regexPositionToGroup = [],
        /* @todo: implement currently version of CSSC */
        useCSSC = (typeof CSSC !== "undefined"), //experemental with alpha version of CSSC
        parseError = false,
        mode = "match";
    
    function _type(elem)
    {
        return Object.prototype.toString.call(elem);
    }
    function crElem(el, attr, innerHTML, toAppend)
    {
        var e = document.createElement(el), a = attr || {}, i, ta = toAppend || [];
        
        setAttr(e, attr);
        if(innerHTML) e.innerHTML = innerHTML;
        for(i = 0; i < ta.length; i++) e.appendChild(ta[i]);
        
        return e;
    }
    function getAttr(el, attr)
    {
        return el.getAttribute(attr);
    }
    function setAttr(el, attrObj, val)
    {
        var t = _type(attrObj), a = t === '[object Object]' ? attrObj : {}, i;
        
        if(t === '[object String]' && _type(val) === '[object String]') a[attrObj] = val;
        
        for(i in a) el.setAttribute(i, a[i]);
    }
    function addEvents(el, evObj)
    {
        for(var i in evObj) el.addEventListener(i, evObj[i]);
    }
    
    function init()
    {
        parentElem = !appendToElem ? document.body : _type(appendToElem) === '[object String]' ? document.getElementById(appendToElem) : appendToElem;
        
        //Create Elements
        //Input
        regexInputElem          = crElem('textarea', {id: 'regexer_input_input'});
        regexInputHighlightElem = crElem('pre',      {id: 'regexer_input_pre'});
        regexInputReplaceElem   = crElem('input',    {id: 'regexer_input_replace', type: 'text'});
        regexInputWrapperElem   = crElem('div',      {id: 'regexer_input'}, false, [regexInputElem, regexInputHighlightElem, regexInputReplaceElem]);
        
        //Output
        regexOutputTextElem      = crElem('textarea', {id: 'regexer_text_txt'});
        regexOutputHighlightElem = crElem('pre',      {id: 'regexer_text_pre'});
        regexOutputReplaceElem   = crElem('textarea', {id: 'regexer_replace_txt', readonly: 'readonly'});
        regexOutputWrapperElem   = crElem('div',      {id: 'regexer_text'}, false, [regexOutputTextElem, regexOutputHighlightElem, regexOutputReplaceElem]);
        
        /* Controlls */
        regexControllButtonMatch   = crElem('a', {id: 'regex_controll_match',   class: (mode === "match" ? 'sel' : '')},   'match');
        regexControllButtonReplace = crElem('a', {id: 'regex_controll_replace', class: (mode === "replace" ? 'sel' : '')}, 'replace');
        
        regexControllModifier_I    = crElem('input', {id: 'regex_controll_modifier_i', type: 'checkbox', title: modifier_I_title});
        regexControllModifier_G    = crElem('input', {id: 'regex_controll_modifier_g', type: 'checkbox', title: modifier_G_title});
        regexControllModifier_M    = crElem('input', {id: 'regex_controll_modifier_m', type: 'checkbox', title: modifier_M_title});
        regexControllModifierArea  = crElem('div',   {id: 'regex_controll_modifier'}, 'Modifier: ', [
                                        regexControllModifier_I, crElem('label', {for: 'regex_controll_modifier_i', title: modifier_I_title}, 'I'), crElem('span',{},'&nbsp;&nbsp;'),
                                        regexControllModifier_G, crElem('label', {for: 'regex_controll_modifier_g', title: modifier_G_title}, 'G'), crElem('span',{},'&nbsp;&nbsp;'),
                                        regexControllModifier_M, crElem('label', {for: 'regex_controll_modifier_m', title: modifier_M_title}, 'M'), crElem('span',{},'&nbsp;&nbsp;')]
                                    );
                            
        regexControllModifier_I.checked = modifier_I;
        regexControllModifier_G.checked = modifier_G;
        regexControllModifier_M.checked = modifier_M;
                            
        regexControllArea = crElem('div', {id: 'regex_controll'}, false, [regexControllButtonMatch, regexControllButtonReplace, regexControllModifierArea]);
        
        //Append Elements in DOM
        parentElem.appendChild(regexControllArea);
        parentElem.appendChild(regexInputWrapperElem);
        parentElem.appendChild(regexOutputWrapperElem);
        
        setOutputHeight();
        manageEvents();
    }
    
    function setOutputHeight()
    {
        if(useCSSC)
        {
            CSSC("#"+getAttr(regexOutputTextElem, "id")).set("height", regexOutputHighlightElem.offsetHeight+"px");
            CSSC("#"+getAttr(regexOutputReplaceElem, "id")).set("height", regexOutputHighlightElem.offsetHeight+"px");
        }
        else
        {
            regexOutputTextElem.style.height = regexOutputHighlightElem.offsetHeight+"px";
            regexOutputReplaceElem.style.height = regexOutputHighlightElem.offsetHeight+"px";
        }
    }
    
    function manageEvents()
    {
        var keyUpParseControll = function(e)
        {
            var parsed = false;
            
            if(e.keyCode === 0 || 
            !(
                (
                    e.keyCode <= 40 &&
                    (
                        e.keyCode !== 13 && e.keyCode !== 8 &&
                        e.keyCode !== 9 && e.keyCode !== 32
                    )
                )
                ||
                (
                    e.keyCode >= 112 && e.keyCode <= 150
                )
                ||
                e.keyCode === 91
                ||
                e.keyCode === 92
            ))
            {
                parse();
                parsed = true;
            }
            
            highlight();
            
            return parsed;
        };
        
        addEvents(regexOutputTextElem, {
            scroll: function()
            {
                regexOutputHighlightElem.scrollTop = this.scrollTop;
            },
            change: function()
            {
                regexOutputHighlightElem.innerHTML = '<span>'+encode(this.value)+'</span>\n';  

                regexOutputHighlightElem.scrollTop = this.scrollTop;

                parse();
            },
            keyup: function(e)
            {
                keyUpParseControll(e);
            }
        });
        
        addEvents(regexInputElem, {
            scroll: function()
            {
                regexInputHighlightElem.scrollTop = this.scrollTop;
            },
            change: function()
            {
                regexInputHighlightElem.scrollTop = this.scrollTop;
            },
            keyup: function(e)
            {
                regexInputHighlightElem.scrollTop = this.scrollTop;

                keyUpParseControll(e);
            },
            click: function(e)
            {
                highlight();
            }
        });
        
        addEvents(regexInputReplaceElem, {
            keyup: function(e)
            {
                keyUpParseControll(e);
            }
        });
        addEvents(regexControllButtonReplace,{
            click: function()
            {
                switchMode("replace");
            }
        });
        addEvents(regexControllButtonMatch, {
            click: function()
            {
                switchMode("match");
            }
        });
        
        addEvents(regexControllModifier_I, {
            change: function()
            {
                modifier_I = regexControllModifier_I.checked;
                parse();
            }
        });
        addEvents(regexControllModifier_G, {
            change: function()
            {
                modifier_G = regexControllModifier_G.checked;
                parse();
            }
        });
        addEvents(regexControllModifier_M, {
            change: function()
            {
                modifier_M = regexControllModifier_M.checked;
                parse();
            }
        });
        
        addEvents(window, {
            resize: function()
            {
                setOutputHeight();
            }
        });
    }
    
    function parse(setScrollPosition)
    {
        if(!regexInputElem.value) return;
            
        try
        {
            var modifierStr = (modifier_I ? 'i' : '') + 
                              (modifier_G ? 'g' : '') + 
                              (modifier_M ? 'm' : '');
            
            regularExpression = new RegExp(regexInputElem.value, modifierStr);
            regularExpressionParser = new RegExpGrpPos(regularExpression, true);
            
            var regMatch = regularExpressionParser.match(regexOutputTextElem.value),
                formString = new formatedString(regexOutputTextElem.value),
                regMatchRow, moduloPosAB, i = 0;
            
            
            
            for(; i < regMatch.length; i++)
            {
                regMatchRow = regMatch[i];
                moduloPosAB = (i % 2 ? 'b' : 'a');
                
                formString.addOpt(regMatchRow[0][1], '<span class="f '+moduloPosAB+' n'+i+'">');
                formString.addOpt(regMatchRow[0][1] + regMatchRow[0][0].length, '</span>');
                
                for(var j = 1; j < regMatchRow.length; j++)
                {
                    formString.addOpt(regMatchRow[j][1], '<span class="g '+moduloPosAB+' n'+j+'">');
                    formString.addOpt(regMatchRow[j][1] + regMatchRow[j][0].length, '</span>');
                }
            }
            
            
            regexOutputHighlightElem.innerHTML = '<span>'+(formString.getFormText(true))+'&nbsp;</span>';
            
            if(useCSSC)
            {
                CSSC("textarea#"+getAttr(regexInputElem, "id")).set("border-color", "#ccc");
            }
            else
            {
                regexInputElem.style.borderColor = "#ccc";
            }
            
            
            regexInputHighlightElem.innerHTML = encode(regexInputElem.value)+'&nbsp;';
            
            calcGropPositions();
            
            if(mode === "replace")
            {
                regexOutputReplaceElem.value = regexOutputTextElem.value.replace(regularExpression, regexInputReplaceElem.value);
            }
            
            //prepaire the complete string
            if(useCSSC)
            {
                var formString = new formatedString(regexInputElem.value),
                    tmp = {};
                
                for(var i = 1; i < regexGroups.length; i++)
                { 
                    for(var j = 0; j < regexGroups[i].length; j++)
                    { 
                        if(!!tmp[regexGroups[i][j]])
                        {
                            tmp[regexGroups[i][j]].push(i);
                        }
                        else
                        { 
                            tmp[regexGroups[i][j]] = [i];
                        } 
                    }
                }
                
                for(var i in tmp)
                {
                    for(var j = 0; j < tmp[i].length; j++)
                    {
                        formString.addOpt(i,'<span class="hg_cssc gn'+tmp[i][j]+'">');
                        formString.addOpt(parseInt(i) + 1,'</span>');
                    }
                }
                regexInputHighlightElem.innerHTML = formString.getFormText(true)+'&nbsp;';
            }
            
            
            parseError = false;
        }
        catch(err)
        {
            console.log(err);
            
            if(useCSSC)
            {
                CSSC("textarea#"+getAttr(regexInputElem, "id")).set("border-color", "#f00");
            }
            else
            {
                regexInputElem.style.borderColor = "#f00";
            }
            
            parseError = true;
        }
        
        if(setScrollPosition)
            regexOutputHighlightElem.scrollTop = this.scrollTop;
    }
    
    var lastHighlight = null;
    function highlight()
    {
        if(parseError)
        {
            return;
        }
        
        var cursorPos = regexInputElem.selectionStart;
        
        if(useCSSC)
        {
            for(var i = 1; i <= regexGroups.length; i++)
            {
                CSSC(".g.n"+i).set("background-color", "rgba(0, 0, 0, 0)");
                CSSC(".hg_cssc.gn"+i).set("background-color", "transparent");
            }
            
            CSSC(".g.n"+regexPositionToGroup[cursorPos]).set("background-color", "rgba(0, 0, 0, 0.2)");
            CSSC(".hg_cssc.gn"+regexPositionToGroup[cursorPos]).set("background-color", "#ffecb3");
        }
        else
        {
            var HighlightElems = regexOutputHighlightElem.getElementsByClassName("g");

            for(var i = 0; i < HighlightElems.length; i++)
            {
                HighlightElems[i].classList.remove("s");
            }

            if(!regexPositionToGroup[cursorPos])
            {
                if(lastHighlight !== null)
                {
                    regexInputHighlightElem.innerHTML = encode(regexInputElem.value)+'&nbsp;';

                    lastHighlight = null;
                }
                return;
            }

            HighlightElems = regexOutputHighlightElem.getElementsByClassName("g n"+regexPositionToGroup[cursorPos]);

            for(var i = 0; i < HighlightElems.length; i++)
            {
                HighlightElems[i].classList.add("s");
            }
            
            var klammerPos = regexPositionToGroup[cursorPos] > 0 ? regexGroups[regexPositionToGroup[cursorPos]] : null;
        
            if(!!klammerPos && lastHighlight !== klammerPos)
            {
                var formString = new formatedString(regexInputElem.value);
                formString.addOpt(klammerPos[0],'<span class="hg">');
                formString.addOpt(klammerPos[0] + 1,'</span>');
                formString.addOpt(klammerPos[1],'<span class="hg">');
                formString.addOpt(klammerPos[1] + 1,'</span>');


                regexInputHighlightElem.innerHTML = formString.getFormText(true)+'&nbsp;';

                lastHighlight = klammerPos;
            }
            else if(lastHighlight !== klammerPos)
            {
                regexInputHighlightElem.innerHTML = regexInputElem.value+'&nbsp;';

                lastHighlight = klammerPos;   
            }
        }
        
    }
    
    function switchMode(m)
    {
        if(m !== "match" && m !=="replace") return;
        
        setAttr(regexControllButtonMatch, {class: ""});
        setAttr(regexControllButtonReplace, {class: ""});
        
        var modeElem = regexControllButtonReplace;
        
        if(m === "match") modeElem = regexControllButtonMatch;
        
        modeElem.classList.add("sel");
        
        setAttr(regexInputWrapperElem, {class: m});
        setAttr(regexOutputWrapperElem, {class: m});
        
        setOutputHeight();
        
        mode = m;
        
        parse();
    }
    
    function calcGropPositions()
    {
        var analyseString = regexInputElem.value; 
        
        regexGroups = [[0,analyseString.length]],
        regexPositionToGroup = [0];
        
        var chr, curGrp = 0, toBreak = false, toCount = false;
        for(var i = 0; i < analyseString.length; i++)
        {
            chr = analyseString[i];
            
            if(analyseString[i-1] !== "\\")
            {
                toCount = true;
            }
            else if(chr === '(' || chr === ')')
            {
                toCount = false;
                
                for (var j = (i - 2); j >= 0; j--)
                {
                    if (analyseString[j] === "\\")
                        toCount = !toCount;
                    else
                        break;
                }
            }
            
            if(toCount && chr === '(')
            {
                regexGroups.push([i, null]);
                
                curGrp = regexGroups.length - 1; 
            }
            else if(toCount && chr === ')')
            {
                toBreak = false;
                curGrp = 0;
                for(var j = (regexGroups.length - 1); j >= 0; j--)
                {
                    if(regexGroups[j][1] === null)
                    {
                        if(!toBreak)
                        {
                            regexGroups[j][1] = i;
                            toBreak = true;
                        }
                        else
                        {
                            curGrp = j;
                            break;
                        }
                    }
                }
            }
            
            regexPositionToGroup[i+1] = curGrp;
        }
    }
    
    this.version = VERSION;
    this.setRegEx = function(regEx)
    {
        var toSet = regEx;
        if(regEx instanceof RegExp)
        {    
            toSet = regEx.source;
            
            modifier_M = !!regEx.multiline;
            modifier_G = !!regEx.global;
            modifier_I = !!regEx.ignoreCase;
            
            regexControllModifier_I.checked = modifier_I;
            regexControllModifier_G.checked = modifier_G;
            regexControllModifier_M.checked = modifier_M;
        }
        
        regexInputElem.innerHTML = toSet;
        
        parse();
    };
    this.setText = function(txt)
    {
        regexOutputTextElem.innerHTML = txt;
        
        parse();
    };
    
    
    init();
    
    if((!!regexInputElem && !!regexInputElem.innerHTML) || (!!regexOutputTextElem && !!regexOutputTextElem.innerHTML))
    {
        parse();
    }
};

var RegExpGrpPos = function(regexp, posabsolute)
{
    var myRegExp = regexp,
        matchStr = null,
        grpPosInfo = null,
        posAbsoluete = !!posabsolute;
    
    var groupFinder = function()
    {
        var regex = myRegExp.toString();

        var groupPos = [],
            grp = [],
            cnt = 0, 
            chr,
            toCount = false;

        for (var i = 0; i < regex.length; i++)
        {
            chr = regex[i];

            if (chr === '(' && regex[i - 1] !== "\\")
            {
                cnt++;

                groupPos.push([cnt, i]);
                
            }
            else if (chr === ')' && regex[i - 1] !== "\\")
            {
                cnt--;
            }
            else if ((chr === '(' || chr === ')') && regex[i - 1] === "\\")
            {
                toCount = false;

                for (var j = i - 2; j > -1; j--)
                {
                    if (regex[j] === "\\")
                        toCount = !toCount;
                    else
                        break;
                }

                if (toCount && chr === '(')
                {
                    cnt++;

                    groupPos.push([cnt, i]);
                }
                else if (toCount && chr === ')')
                {
                    cnt--;
                }
            }
        }

        return (cnt === 0 ? groupPos : false);
    },
    findPositions = function(matches)
    {
        var m = [], tmpIndex = 0, foundIndex = matches.index, posM1, posM2;

        m[0] = [matches[0], (!!posAbsoluete ? foundIndex : tmpIndex)];

        for (var i = 1; i < matches.length; i++)
        {
            posM1 = (!!grpPosInfo[i - 1]) ? grpPosInfo[i - 1][0] : 0;
            posM2 = (!!grpPosInfo[i - 2]) ? grpPosInfo[i - 2][0] : 0;
            
            if (posM1 > posM2)
            {
                tmpIndex = (!!posAbsoluete ? (m[i - 1][1] - foundIndex) : m[i - 1][1]); 
            }
            else if(posM1 < posM2)
            {
                tmpIndex = (!!posAbsoluete ? ((m[i - 1][1] + m[i - 1][0].length) - foundIndex) : (m[i - 1][1] + m[i - 1][0].length));
            }

            if (!!matches[i])
            {
                tmpIndex = matches[0].indexOf(matches[i], tmpIndex);

                m[i] = [matches[i], (!!posAbsoluete ? (tmpIndex + foundIndex) : tmpIndex)];

                tmpIndex += matches[i].length;
            }
            else
            {
                m[i] = ["", (!!posAbsoluete ? (tmpIndex + foundIndex) : tmpIndex)];
            }
        }
        
        return m;
    };
    
    this.match = function(str)
    {
        matchStr = str;
        grpPosInfo = groupFinder();
        
        //console.log(grpPosInfo);
        var matches, 
            lastIndex = null,
            retrn = [];

        while((matches = myRegExp.exec(str)) !== null && lastIndex !== matches.index)
        {
            retrn.push(findPositions(matches));

            lastIndex = matches.index;
        }
        
        return retrn;
    };
    this.setPositionAbsolute = function(posabsulute)
    {
        posAbsoluete = !!posabsulute;
    };
};

var formatedString = function(string)
{
    var orgString = string;
    var options = {};
    
    var encode = function(txt)
    {
        return txt.replace(/[\x26\x0A\x3c\x3e\x22\x27]/g, function(txt) 
        {
            return "&#" + txt.charCodeAt(0) + ";";
        });
    },
    parse = function(encodeString)
    {
        var lastPos = 0, formString = "";
        for(var pos in options)
        {
            if(!!encodeString)
            {
                formString += encode(orgString.substr(lastPos, (pos - lastPos)));
            }
            else
            {
                formString += orgString.substr(lastPos, (pos - lastPos));
            }
        
            for(var i = 0; i < options[pos].length; i++)
            {
                formString += options[pos][i];
            }
            
            lastPos = pos;
        }
        
        if(!!encodeString)
        {
            formString += encode(orgString.substr(lastPos));
        }
        else
        {
            formString += orgString.substr(lastPos);
        }
        
        return formString;
    };
    
    this.addOpt = function(pos, opt)
    {
        if(!options[pos])
        {
            options[pos] = [];
        }
        
        options[pos].push(opt);
    };
    this.getOpts = function()
    {
        return options;
    };
    this.getOrgText = function()
    {
        return orgString;
    };
    this.getFormText = function(encodeString)
    {
        return parse(encodeString);
    };
};

var encode = function(txt)
{
    return txt.replace(/[\x26\x0A\x3c\x3e\x22\x27]/g, function(txt) 
    {
        return "&#" + txt.charCodeAt(0) + ";";
    });
};
