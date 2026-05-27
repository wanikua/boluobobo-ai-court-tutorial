# L-Stage Review Findings (Codex)

Codex audit of 5 sample regimes after PR #6 auto-generation. Actionable items for v5.1.

## Fixed in this commit

- **china/tang**: 司礼监 (Ming-Qing eunuch agency) was misplaced in Tang architecture. Replaced with 中书舍人 (Zhongshu Sheren, Tang drafter). "运行超过 1300 年" overclaim clarified — only the three-省 framework persisted, not the specific Tang configuration.

## Deferred to v5.1

- **global/byzantine**: Patriarch depicted as routine ethics veto — overstated. `theokrator` is literary, not a standard office title.
- **global/roman-republic**: Chart too linear. Assemblies (Comitia) should sit more prominently above consuls and senate. Censor placed too actively in day-to-day flow (role was periodic, not continuous).
- **global/prussia**: Compresses 1701-1918 into one snapshot. `Ober-Kriegsrat` may be invented. `Kammerdirektor` is too generic. Recommend splitting into `prussia-frederick` (18c) and `prussia-bismarck` (19c).
- **global/ottoman**: `Nişancı` miscast as 大法官 (should be pen-bearer/tuğra authenticator). Janissary Aga's direct-to-Sultan reporting path overcentralized — ignores parallel ulema channel. One source citation (`Patrick Balfour`) format nonstandard.

## Not yet reviewed (other sampling rounds failed)

- A second-round review (originally attempted on a now-removed provider) did not complete.
- cc-mimo third-round review hit `--max-turns 1` limit mid-output; re-run needed.

v5.1 plan: complete the second/third review rounds via Codex + opencode + Mimo on a dedicated branch, fix Byzantine/Roman/Prussian/Ottoman per above. (gemini is no longer used — see CHANGELOG v5.1.0.)
