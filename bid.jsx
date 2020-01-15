const {useState, useEffect, useCallback, useMemo} = React;

const extractBet = betString => {
  const extract = /^(.*?),? *((?:[0-9]{1,2} *bid *(?:(?=[^0-9])|$)|at *[0-9]{1,2} *|bid *[0-9]{1,2} *){1,2})(?:that *)?(.*)$/;
  let bid = null;
  let ask = null;
  let proposition = null;
  const result = betString.match(extract);
  if (result !== null) {
    const extract_2 = /(?:([0-9]{1,2}) *bid *(?:(?=[^0-9])|$)|at *([0-9]{1,2}) *|bid *([0-9]{1,2}) *)/g;

    const bidask = result[2];
    while (true) {
      const match = extract_2.exec(bidask);
      if (!match) {
        break;
      }
      if (match[1] !== undefined) {
        bid = parseFloat(match[1])/100.0;
      }
      if (match[3] !== undefined) {
        bid = parseFloat(match[3])/100.0;
      }
      if (match[2] !== undefined) {
        ask = parseFloat(match[2])/100.0;
      }
    }
    if (result[1].trim() && result[3].trim()) {
      proposition = `${result[1].trim()} ... ${result[3].trim()}`;
    } else {
      proposition = `${result[1].trim()}${result[3].trim()}`;
    }
  }
  return {bid, ask, proposition};
}

const OrRow = () => (
  <div style={{display: 'flex', flexDirection: 'row', alignItems: 'baseline'}}>
    <hr style={{flexGrow: 1}}/>
    <span><h3 style={{marginLeft: '20px', marginRight: '20px'}}>OR</h3></span>
    <hr style={{flexGrow: 1}}/>
  </div>
)

function parseQS(qs) {
  const result = {}
  Array.from(new URLSearchParams(qs).entries()).forEach(item => {
    result[item[0]] = item[1]
  })
  return result
}

function buildQS(o) {
  const queryParams = new URLSearchParams(o).toString()
  return queryParams ? `?${queryParams}` : '?'
}

const DECODERS = {
  string: s => s,
  datetime: s => (s !== '' ? new Date(s) : null),
  number: s => Number(s),
  stringArray: s => s.split(','),
  boolean: s => s === 'true',
  json: s => JSON.parse(s),
}

const ENCODERS = {
  string: s => s,
  datetime: d => (d !== null ? d.toISOString() : ''),
  number: n => String(n),
  stringArray: a => a.join(','),
  boolean: b => String(b),
  json: j => JSON.stringify(j),
}

function getQSValue(name) {
  return parseQS(window.location.search)[name]
}
function useQueryString({name, type, defaultValue}) {
  const decoder = DECODERS[type] || (s => s)
  const encoder = ENCODERS[type] || (s => s)

  const [value, setValue] = useState(() => {
    const existingValue = getQSValue(name)
    if (existingValue) {
      return decoder(existingValue)
    } else {
      return typeof defaultValue === 'function' ? defaultValue() : defaultValue
    }
  })

  useEffect(() => {
    const qsData = parseQS(window.location.search)
    if (value === null) {
      delete qsData[name]
    } else if (value !== undefined && value !== '') {
      qsData[name] = encoder(value)
    }
    window.history.pushState('', '', buildQS(qsData))
  }, [name, value, encoder, type])

  useEffect(() => {
    function setValueFromQS() {
      const qsValue = getQSValue(name)
      if (qsValue !== undefined && qsValue !== '') {
        setValue(decoder(qsValue))
      }
    }

    window.addEventListener('popstate', setValueFromQS)
    return () => {
      window.removeEventListener('popstate', setValueFromQS)
    }
  }, [setValue, decoder, name])

  return [value, setValue]
}

const EXAMPLES = [
  {value: "The sun will come up tomorrow, 10 bid"},
  {value: "This coin toss will come up heads, 50 bid at 50"},
  {value: "Karen will work past 10pm today, 70 bid at 90"},
  {value: "Your desk is going to collapse, at 10"},
  {value: "This sale will go through without and yet we won't hear back from them in the next week, 30 bid at 50"},
]
const Weak = ({children}) => <span style={{color: '#aaaaaa'}} children={children}/>

const App = () => {
  const [show_as_jst, setShowAsJST] = useQueryString({name: "show_as_jst", type: "boolean", defaultValue: localStorage.show_as_jst !== "no"})
  const [isCounterer, setIsCounterer] = useState(localStorage.isCounterer !== "no")
  const [value, setValue] = useQueryString({name: "value", type: "string", defaultValue: ""});
  const [currency_prefix, setCurrencyPrefix] = useQueryString({name: "currency_prefix", type: "string", defaultValue: ""});
  const [currency_postfix, setCurrencyPostfix] = useQueryString({name: "currency_postfix", type: "string", defaultValue: " points"});
  const [amount, setAmount] = useState(10);
  const [counterer, proposer] = isCounterer ? ["you", "they"] : ["they", "you"];

  localStorage.show_as_jst = show_as_jst ? "yes" : "no"
  localStorage.isCounterer = isCounterer ? "yes" : "no"

  const {bid, ask, proposition} = useMemo(() => {
    return extractBet(value)
  }, [value])
  const update = useCallback(({target: {value}}) => {
    setValue(value);
  })
  const formatCurrency = x => {
    if (x === undefined || x === null) {
      return null;
    }
    x = parseFloat(x);
    return `${currency_prefix || ""}${x.toFixed(2)}${currency_postfix || ""}`;
  }
  const percent = x => {
    if (x === undefined || x === null) {
      return null;
    }
    x = parseFloat(x);
    return (x * 100).toFixed(0);
  }
  
  return <div>
    <h1> JST-style betting calculator </h1>

    <div>
      Enter {proposer === "you" ? "your" : "their"} proposition and bid/ask, in the form "the sky is blue, 98 bid at 99". Examples:
      <ul>
        {EXAMPLES.map(ex => <li>
          <a href={"bid.html" + buildQS(ex)}>{ex.value}</a>
        </li>)}
      </ul>
    </div>
    <h3><form><label>
      <input
        name="countering"
        type="checkbox"
        checked={isCounterer}
        onChange={event => setIsCounterer(event.target.checked)} />

      {" "}I'm the person countering the bet (as opposed to the person offering it)
    </label></form></h3>
    <hr/>
    <div className="mui-textfield mui-textfield--float-label">
      <textarea value={value} onChange={update} />
      <label>{proposer === "you" ? "your" : "their"} message, in JST format, proposing the bet (out of {formatCurrency(amount)})</label>
    </div>

    {proposition && <div>
      <ul className="mui-tabs__bar">
        <li className={ show_as_jst ? "mui--is-active" : ""}><a onClick={() => setShowAsJST(true)}>Bid style</a></li>
        <li className={!show_as_jst ? "mui--is-active" : ""}><a onClick={() => setShowAsJST(false)}>Betting style</a></li>
      </ul>
      <div className="mui-panel">
        <div className={ show_as_jst ? "mui-tabs__pane mui--is-active" : "mui-tabs__pane"}>
          <h3> You're trading on a proposal worth {formatCurrency(amount)} if {proposition} resolves true,</h3>
          <span>and according to the bet {proposer}'re proposing,</span>
          <h4>
            {bid !== null && <span>{percent(bid)}% <Weak>is less than</Weak></span>} {proposer === "you" ? "your" : "their"} estimate of its probability{ask !== null && <span><Weak>{bid !== null && ", which "} is less than</Weak> {percent(ask)}%</span>}.
          </h4>
          {bid !== null && <p>
            <hr/>
            If {counterer} believe the true probability is less than {percent(bid)}, then {proposer}'re buying this proposition for too much, and {counterer} should take {proposer === "you" ? "your" : "their"} bet.
            <h3> {counterer} can accept {proposer === "you" ? "your" : "their"} bid by saying "sold". </h3>

            Once the proposition resolves, {proposer}'ll owe {counterer} <strong>{formatCurrency(amount*bid)} regardless</strong> for buying the proposition, but if the proposition was true, {counterer}'ll owe them {formatCurrency(amount)} (which adds up to <strong>{formatCurrency(amount*(1-bid))}</strong>).

          </p>}
          {ask !== null && <p>
            <hr/>
            If {counterer} believe the true probability is greater than {percent(ask)}, then {proposer}'re selling this proposition for too little, and {counterer} should take {proposer === "you" ? "your" : "their"} bet.
            <h3> {counterer} can accept {proposer === "you" ? "your" : "their"} ask bet by saying "taken". </h3>

            Once the proposition resolves, {counterer}'ll owe them <strong>{formatCurrency(amount*ask)} regardless</strong> for buying the proposition, but if the proposition was true, {proposer}'ll owe {counterer} {formatCurrency(amount)} back, (which adds up to <strong>{formatCurrency(amount*(1-ask))}</strong>).

          </p>}
        </div>
        <div className={!show_as_jst ? "mui-tabs__pane mui--is-active" : "mui-tabs__pane"}>
          <h3> {counterer}'re considering a bet worth {formatCurrency(amount)} if {proposition} resolves true,</h3>
          <span>and according to the bet {proposer}'re proposing,</span>
          <h4>
            {bid !== null && <span>{percent(bid)}% <Weak>is less than</Weak></span>} {proposer === "you" ? "your" : "their"} estimate of its probability{ask !== null && <span><Weak>{bid !== null && ", which "} is less than</Weak> {percent(ask)}%</span>}.
          </h4>
          {bid !== null && <div><p>
            <hr/>
            <h3> {proposer}'ll take the yes side of the bet at {percent(bid)} yes to {percent(1-bid)} no odds: </h3>
            <h4> {proposer === "you" ? "your" : "their"} {formatCurrency(amount*bid)} </h4>
            that the claim <strong>"{proposition}"</strong> is true or resolves to being true
            <h4> to {counterer === "you" ? "your" : "their"} {formatCurrency(amount*(1-bid))}</h4>
            that it's false or resolves to being false.
          </p><p>
            {counterer} can accept this bet by saying, for example, "my {formatCurrency(amount*(1-bid))} no to
            your {formatCurrency(amount*bid)} yes, we're on". It's probably faster to say "sold" - see the other tab.
          </p>
          </div>}
          {(ask !== null && bid !== null && <OrRow/>)}
          {ask !== null && <div><p>
            <h3> {proposer}'ll take the no side of the bet at {percent(ask)} yes to {percent(1-ask)} no odds: </h3>
            <h4> Your {formatCurrency(amount*ask)} </h4>
            that the claim <strong>"{proposition}"</strong> is true or resolves to being true
            <h4> to their {formatCurrency(amount*(1-ask))}</h4>
            that it's false or resolves to being false.
          </p>
          <p>
            {counterer} can accept {proposer === "you" ? "your" : "their"} bet by saying, for example, "my {formatCurrency(amount*ask)} yes to
            your {formatCurrency(amount*(1-ask))} no, we're on". It's probably faster to say "taken" - see the other tab.

          </p></div>}

        </div>
      </div>
    </div>
    }
  </div>;
}
ReactDOM.render(
  <App/>,
  document.getElementById('container')
);
