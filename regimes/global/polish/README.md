# Polish-Lithuanian Commonwealth / 波兰立陶宛联邦选举君主制

> **Regime ID**: `polish`
> **Era**: 1569-1795 · Elective Monarchy / 选举君主制
> **Region**: Global · **Agents**: 6 · **Pattern**: Democratic Council

---

## 1. Historical Background / 历史背景

### English

The Polish-Lithuanian Commonwealth (1569-1795) was one of the largest and most unusual states in European history. Born from the Union of Lublin (1569), which merged the Kingdom of Poland and the Grand Duchy of Lithuania into a single political entity, the Commonwealth was a noble republic masquerading as a monarchy.

Its defining feature was the "Golden Liberty" (*Złota Wolność*) — a set of rights enjoyed by the szlachta (nobility), who constituted roughly 8-10% of the population, an extraordinarily high proportion for the era. The szlachta elected their kings, controlled legislation through the Sejm (parliament), and from 1652 onward wielded the *Liberum Veto*: the right of any single deputy to dissolve the entire parliamentary session and nullify all its legislation.

The Warsaw Confederation of 1573 guaranteed religious tolerance centuries before it became common in Europe. The Commonwealth was a haven for persecuted minorities: Jews, Protestants, Orthodox Christians, and Muslims all found refuge. At its peak under the Jagiellonian dynasty and early elected kings, the Commonwealth was a major European power stretching from the Baltic to the Black Sea.

The Liberum Veto, initially a safeguard of noble liberty, gradually became a tool of foreign interference and domestic paralysis. By the 18th century, Russia, Prussia, and Austria routinely bribed deputies to veto reform legislation, leading to the three partitions (1772, 1793, 1795) that erased the Commonwealth from the map.

### 中文

波兰立陶宛联邦（1569-1795）是欧洲历史上最大、最独特的国家之一。它诞生于1569年的卢布林联合，将波兰王国与立陶宛大公国合并为一个政治实体——实质上是一个披着君主制外衣的贵族共和国。

其核心特征是"黄金自由"（*Złota Wolność*）——贵族阶层（szlachta）享有的一系列权利。贵族约占总人口的8-10%，在当时是极高的比例。贵族选举国王、通过瑟姆（Sejm，议会）控制立法，并且从1652年起拥有"自由否决权"（*Liberum Veto*）：任何一位议员均可解散整个议会会期，使全部立法作废。

1573年的华沙联盟保障了宗教宽容，比欧洲普遍实行要早数个世纪。联邦是受迫害少数群体的避难所：犹太人、新教徒、东正教徒和穆斯林都在此找到庇护。在雅盖隆王朝及早期选举制国王统治下的鼎盛期，联邦是从波罗的海延伸到黑海的欧洲大国。

自由否决权最初是贵族自由的保障，却逐渐沦为外国干涉与国内瘫痪的工具。到18世纪，俄国、普鲁士和奥地利经常贿赂议员否决改革法案，最终导致三次瓜分（1772、1793、1795），联邦从地图上消失。

---

## 2. System Design / 系统设计

### Organizational Structure / 组织架构

```
         ╔══════════════════════════════════╗
         ║   Szlachta (Noble Electorate)    ║
         ║   贵族选举团 (~10% of population) ║
         ╚══════════════╤═══════════════════╝
                        │ elects
              ┌─────────▼──────────┐
              │  King (Elected)    │
              │  选举制国王         │
              │  bound by pacta    │
              │  conventa          │
              └─────────┬──────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
  ┌─────▼─────┐   ┌────▼─────┐   ┌────▼──────┐
  │  Senate   │   │  Sejm    │   │  Hetman   │
  │  元老院    │   │  瑟姆议会 │   │  大统领    │
  │ (Advisory)│   │ (SUPREME)│   │ (Military)│
  └───────────┘   └────┬─────┘   └───────────┘
                       │
              ┌────────┼────────┐
              │                 │
        ┌─────▼─────┐    ┌────▼──────┐
        │  Marshal  │    │Chancellor │
        │  瑟姆元帅  │    │  大法官    │
        │ (Speaker) │    │(Gt. Seal) │
        └───────────┘    └───────────┘

  ⚡ LIBERUM VETO: Any single deputy can
     nullify the ENTIRE Sejm session!
```

### Agent Mapping / 智能体映射

| Agent | Role | Model | Temperature | Priority |
|-------|------|-------|-------------|----------|
| King (选举国王) | Elected monarch, executive | Claude Opus 4.6 | 0.6 | High |
| Sejm (瑟姆议会) | Supreme legislative body | GPT-5.4 Pro | 0.8 | Highest |
| Senate (元老院) | Upper house, advisory | GPT-5.4 | 0.5 | High |
| Hetman (大统领) | Supreme military commander | DeepSeek R2 | 0.5 | Medium |
| Chancellor (大法官) | Legal officer, Great Seal | MiMo v2 Pro | 0.4 | Medium |
| Marshal of the Sejm (瑟姆元帅) | Parliamentary speaker | Kimi K2.5 | 0.5 | Medium |

---

## 3. Orchestration Pattern / 编排模式

**Pattern**: Democratic Council (民主议事)

The Democratic Council pattern models governance where decision-making authority is radically distributed, requiring near-unanimous consensus. Key characteristics:

- **Consensus Requirement**: Decisions require agreement from all participants (Liberum Veto as the extreme form)
- **Elected Leadership**: The executive (King) is chosen by the governed (szlachta) and contractually bound
- **Individual Sovereignty**: Each participant retains veto power — no majority can override a minority of one
- **Procedural Gatekeeper**: The Marshal of the Sejm controls process and validates veto invocations
- **Emergency Override**: The Confederation mechanism allows majority rule when consensus fails

**Decision Flow**:
```
Proposal → Sejm debate (all voices heard)
  → Marshal manages procedure
  → IF Liberum Veto invoked AND valid: session nullified
  → IF no veto: Senate reviews → Chancellor seals → King executes
  → IF gridlock persists: Confederation formed (majority rule)
```

**Unique Feature — Liberum Veto Implementation**:
```
Agent sends: { "action": "liberum_veto", "deputy": "agent-id", "reason": "..." }
  → Marshal validates: Is the deputy legitimate? Is the invocation proper?
  → IF valid: ALL pending decisions in current session are ROLLED BACK
  → Session terminates; new session must be convened
```

---

## 4. Comparison / 对比分析

| Dimension | Polish Commonwealth | Habsburg Dual Monarchy | Napoleonic Empire |
|-----------|-------------------|----------------------|-------------------|
| **Sovereignty** | Noble democracy | Dual sovereignty | Personal autocracy |
| **Veto Power** | Any single noble | Kaiser + Delegations | Emperor only |
| **Decision Speed** | Very slow (consensus) | Slow (dual consultation) | Very fast |
| **Inclusion** | Broad (10% nobility) | Narrow (elites) | Meritocratic |
| **Religious Policy** | Tolerant (Warsaw 1573) | Catholic-dominated | Concordat-pragmatic |
| **Military** | Dependent on Sejm funding | Shared k.u.k. | Emperor commands |
| **Fatal Flaw** | Paralysis via veto abuse | Ethnic fragmentation | Personal dependency |

---

## 5. Use Cases / 应用场景

### AI System Design
- **Consensus protocols**: Blockchain-style unanimous validation where any node can reject a block — mirrors the Liberum Veto in distributed consensus
- **Multi-stakeholder AI governance**: AI ethics boards where any member can block a deployment — ensuring thorough deliberation at the cost of speed
- **Federated AI councils**: Multiple independent AI organizations that must unanimously agree on standards, with a "Confederation" escape valve for emergencies
- **DAO governance**: Decentralized Autonomous Organizations with individual veto rights and elected leadership

### Organizational Modeling
- **Open-source governance**: Projects where any core maintainer can block a merge (e.g., Linux kernel review process), with "Confederation" forks as escape valves
- **Academic committees**: Tenure decisions requiring unanimous department vote
- **UN Security Council**: Veto power of permanent members mirrors the Liberum Veto (though limited to 5 members rather than all)

---

## 6. Dialogue Example / 对话示例

```
[King]: Noble deputies, I bring before the Sejm a proposal for a new
        tax to fund fortifications on the eastern border. The Ottoman
        threat grows daily.

[Marshal]: The floor recognizes His Majesty's proposal. Deputies may
           speak in order of seniority.

[Sejm]: *Multiple voices arise in passionate debate*
        Deputy Radziwiłł: "The treasury wastes our gold on court luxuries
        while our borders lie open! I support the tax IF the King accounts
        for last year's expenditures."
        Deputy Potocki: "We cannot burden the lesser szlachta further.
        Let the magnates pay — they have the estates!"
        Deputy Sapieha: "I speak for Lithuania. Our borders face Muscovy,
        not the Ottomans. Why should Lithuanian gold fortify Polish walls?"

[Senate]: The Senate counsels wisdom. We have faced this threat before.
          In 1621, Hetman Chodkiewicz held Khotyn with inadequate forces
          because the Sejm delayed funding. Let us not repeat that error.

[Hetman]: I confirm the threat assessment. I need 30,000 men and 200
          cannon. Without the tax, I can field perhaps 12,000 with
          what remains in the treasury.

[Sejm]: Deputy Lubomirski: "I invoke my right as a noble of the
        Commonwealth — the Sejm must guarantee that this tax expires
        after two years, or I shall exercise my Liberum Veto."

[Marshal]: The Deputy's condition is noted. The proposal now reads:
           a two-year emergency tax for eastern fortifications. Do any
           deputies object? ... *long pause* ... Hearing no veto, the
           measure passes. Chancellor — prepare the decree for sealing.

[Chancellor]: The decree is lawful and consistent with precedent.
              I shall affix the Great Seal.

[King]: The Commonwealth has spoken with one voice. Hetman — you shall
        have your fortifications. God save the Republic.
```

---

## 7. Academic References / 学术参考

1. **Davies, N.** (1982). *God's Playground: A History of Poland*. 2 vols. New York: Columbia University Press.
2. **Frost, R.I.** (2015). *The Oxford History of Poland-Lithuania, Volume I: The Making of the Polish-Lithuanian Union, 1385-1569*. Oxford: Oxford University Press.
3. **Lukowski, J.** (1991). *Liberty's Folly: The Polish-Lithuanian Commonwealth in the Eighteenth Century*. London: Routledge.
4. **Stone, D.** (2001). *The Polish-Lithuanian State, 1386-1795*. Seattle: University of Washington Press.
5. **Butterwick, R.** (1998). *Poland's Last King and English Culture: Stanisław August Poniatowski, 1732-1798*. Oxford: Clarendon Press.
6. **Friedrich, K.** (2000). *The Other Prussia: Royal Prussia, Poland and Liberty, 1569-1772*. Cambridge: Cambridge University Press.
7. **Zamoyski, A.** (1987). *The Polish Way: A Thousand-Year History of the Poles and Their Culture*. London: John Murray.
8. **Rosman, M.J.** (1990). *The Lords' Jews: Magnate-Jewish Relations in the Polish-Lithuanian Commonwealth during the Eighteenth Century*. Cambridge: Harvard University Press.
9. **Frost, R.I.** (2000). *The Northern Wars: War, State and Society in Northeastern Europe, 1558-1721*. Harlow: Longman.
10. **Müller, M.G.** (2010). "The Polish-Lithuanian Commonwealth in European Context" in *The Cambridge History of Poland*, eds. Bues & Rüther.
