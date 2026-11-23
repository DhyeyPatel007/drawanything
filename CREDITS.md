# Credits

## Drum samples

All drum one-shots in `public/samples/` come from **Virtuosity Drums** by
Karoryfer Samples (sfzinstruments), released under **CC0 1.0** (public domain
dedication) — https://github.com/sfzinstruments/virtuosity_drums

Source recordings: overhead ("oh") microphone takes. Files were trimmed
(kick/snare/hats/toms ≤ 1.6 s, open hat ≤ 1.4 s, crash ≤ 3 s), given a 0.25 s
fade-out, loudness-normalised to −15 LUFS, and encoded as Opus 128 kbps.

Mapping (app name → source file):

| app | source |
| --- | --- |
| kick_soft_1/2 | oh_kick_snon_vl2_rr1 / rr2 |
| kick_hard_1/2 | oh_kick_snon_vl4_rr1 / rr2 |
| snare_soft / hard | oh_snare_center_vl5 / vl11 |
| rim_soft / hard | oh_snare_rimshot_vl4 / vl9 |
| hatc_soft_1/2 | oh_hh_closed_vl2_rr1 / rr2 |
| hatc_hard_1/2 | oh_hh_closed_vl4_rr1 / rr2 |
| hato_soft_1 | oh_hh_open_vl2_rr1 |
| hato_hard_1 | oh_hh_open_vl3_rr1 |
| tomh_soft / hard | oh_htom_center_vl5 / vl13 |
| toml_soft / hard | oh_ltom_center_vl5 / vl13 |
| crash_soft / hard | oh_crash_crash_vl1_rr1 / vl3_rr1 |

The design panel originally picked the Fingerdrum / Re:TUNES acoustic kit
(CC BY 4.0); the shipped kit is Virtuosity Drums because its individual
recordings are directly downloadable and CC0, which keeps redistribution
trivially clean. Same method either way: real acoustic recordings, two
velocity layers, no synthesis.
