# Fonts

`DynaPuff.ttf`: DynaPuff by The DynaPuff Project Authors (https://github.com/googlefonts/dynapuff), licensed under the
SIL Open Font License 1.1 (https://openfontlicense.org). The same font the site loads through next/font; this copy is
only used to draw the Open Graph preview images (src/core/seo/og.tsx), which can't use a web font.

It is the variable font with its variation tables (fvar, gvar, avar, HVAR, STAT) removed, which leaves the default
instance (regular weight) as a static font: the image renderer (satori) can't read variable fonts.
