/* =============================================================
   cartel.js -> Los carteles de 'lines' del original: WAVE n y
   WAVE COMPLETE.

   COMO LOS SACA EL SWF

   Son una ventana de 'madness_popup' (sprite 7873) parada en su
   fotograma 'lines' (el 10). MadnessEvents los pide asi:

     al pulsar el panel   addBuffer(10); addPopup('lines', 'WAVE ' + n,
                          ..., 440, 170, ..., 90, arena_1_waves)
     al limpiar la sala   addPopup('lines', 'WAVE COMPLETE', ..., 440,
                          170, ..., 90)

   y MadnessPopup (desensamblado) hace, a 30 fotogramas por segundo:

     init   _alpha = 20, gotoAndStop('lines'), el texto en los dos
            campos, y playSound('menu3') -> S_Menu3
     tick   myTimer-- hasta 1; mientras aparece, _alpha += 20 hasta
            100; con el reloj en 1 deja de aparecer, _alpha -= 20, y a
            cero se cierra y llama a su funcion (la de WAVE n es la que
            suelta la oleada).

   O sea: entra en cuatro saltos de 20, aguanta y sale en cinco. Por
   saltos, no fundido: es lo que hace Flash.

   LO QUE HAY EN EL FOTOGRAMA 'lines' (coordenadas del SWF, respecto
   al origen del cartel):

     prof 1  la mancha, forma 7759
     prof 2  campo de texto 7760 (Impact 888, 79 px, negro, centrado)
             en (-345,5; -36,35), con GlowFilter rojo 8 x 8, fuerza 2
     prof 3  forma 900 a escala 0,253 en (-223,5; -76,25): la MASCARA
             de rayas horizontales de la profundidad 4
     prof 4  campo 7761, igual, en (-345,5; -35,1), GlowFilter rojo
             37 x 8, fuerza 1,5: el brillo ancho, visto por las rayas

   La mancha y la mascara se pintan con Ruffle a x2 (tools/swf_cartel);
   el texto se escribe aqui con los glifos de Impact sacados del SWF
   (css/fuentes_swf.css), porque cambia: WAVE 1, WAVE 2... Y el brillo
   se hace como lo hace Flash, no con un shadowBlur: el alfa del texto
   se emborrona con una caja de blurX x blurY -calidad 1, una pasada-,
   se multiplica por la fuerza, se recorta a 1 y se pinta en rojo
   debajo del texto. Ruffle aqui no pinta los filtros, asi que el
   texto se calibro contra su render sin filtro: la linea base cae en
   y + 79,2 y el centro en x + 350,25.
   ============================================================= */
(function (global) {
  'use strict';

  const Cartel = {};

  const ESCENARIO = { an: 850, al: 530 };     // el del SWF
  const ORIGEN = { x: 440, y: 170 };           // addPopup(..., 440, 170, ...)
  /* La caja que se pinta, en px del SWF alrededor del origen: cabe el
     brillo ancho de la profundidad 4. */
  const CAJA = { x0: -380, y0: -50, x1: 380, y1: 112 };
  const MANCHA = { x: -139.5, y: -44.0, an: 280.5, al: 136.5, src: 'data:image/png;base64,' +
    'iVBORw0KGgoAAAANSUhEUgAAAjEAAAERCAQAAAAgIj7UAAAoSUlEQVR42u2dd5zVxNrHfyr3usDSO1KWJohSBAVBRK/IBRHpWFAU' +
    'sSAgooCIAooVGxdFLHBBEWk2pAkoCEjn0psUQWDZpS0dFqzvef/Ys2eTk0wySSan7Pl95/OBPUlmMvNk8mTKM89cAkIShyKoj7rI' +
    'i01YjlMUByFEHf/ECPyNQDD8hbeRl0IhhKhiTUi9ZIf3KRRCiBqeMiiYAC6gBAVDCFHBdhMVE8DdFIzfXEoRkISghunRFAqGKoZo' +
    'KYZ3kIKW6EpROKKkoKaXpGgI0fJAsIHfg6JwRGHTblIAT1E0bMUQLZ2D/y+nKBxxGn+ZHt9B0RCSQ4Hgt/cEReGYn03aMKlIomDY' +
    'iiE5tAv+v4SicMwyk2NP4jcKxm/yxHHek9EK16Ee6uFSpGMPfsQc/JpLnktxNMAVKIGTSMMWpAaPdgr+P5UV1zGj0ByVdEf6YgbF' +
    'QsT0x0mTpu9aPBLnZuF58TiWhZVqDz5GZ1QK/uLaGrfdzAk4FJThQTxOgRAxdyBdMEMQQABHQx2K+GMAMixKlhVeYwXQURStMBiD' +
    '0QaVJa4uiAYoRqERKzrZvoQBTIzLkn0qUbIAirMKaFTyPp1szmMOrqJYiBcaSr2GASyIu5LNlCzZ16wEAIAULBdI6BUKh7hnleSL' +
    'GMCPcVWu/0iXK4C5hsnWNglXD5rgooWEduNqvirEDXc7eBEDeC9uyvW4o3IFsAT5NbFLYbKLe96EgRiKB9AoDrteVXHKRkIZqMnX' +
    'hTjnJ4evYue4KFU5h6UKIIDFmvif42VH9xtkkONK3BZX9WChhIT2oyBfGOKMZMcv4gkkx0G5PnShYgLoHox9CwJo76Dt8quwZZQS' +
    'J/WgkaSEPuIrQ/ypWtowKOZLVdaVggngVLCDsxcBVFSizA7GiZIZKymhc3xliDO6uHgRM2LeFO9ZlyomgCkAhiCAgOSdJtumuCUu' +
    '6sF+aQndypeGOGGIqxcx1sdjfnStYgLBYeJUqfv0k0qxf8zXghQH8nmULw2RIz8aoquDCWttGBXTJcvnQcFkh/9J3KeA6YILY9gX' +
    '83WhpQPJDHSYdjXciFq4gi+cOmJ9GWQR3IX2qIPSHtJoGtMlVJG7oxLX9EYRyTZCAymVFT2czBNlSNayXmiDSjpn4buwEIvwI85Q' +
    'SeTedsu9mKPgCy8/UhEdnlFQvvES9/lZOrWeMV4zHnIgmdttU6uCMUIjvkxcwxcx97ZiXkPfhHgCpRSk8aftFcUcrNyJdWuS3x1c' +
    'e8Tm/POWi0r7YFvES5eEOjiEg7mngseuS6oUhWnF8spaFZa1h2yvqO4gtfMxXmfPOCjJRkvJL7BUMAvwSYRL1hkLcBGrkYoAtuNF' +
    '7lbpJwVwVlEnyWtHqTJuQQMfPdV/57l0Mn582zlI798xXjdulC6J1bKKMkITxOzQKMLlGmFiQlCUqsAvnlWoYC64zsVjmrW8G9DY' +
    'l5Ku8Vy+JyXu8qiD9CoIUymMK3Al6qEJ8kX185MpWZJ2wjRKYKdN3J8jWqZkLDDNxcdUBf7QBOcVqhh3/dp8mGdIqb5EvEfwAaZj' +
    'Lh6WvM+vnsv3kmKVracs7sBgTA/zyxLAlyE3n5FnjFQ5jls4/54fY0toRZ6CzqOAyxSrYwRWYS/OIBPz0DbRVUpr3YRqI6UKJuDK' +
    'mXZxbHJhf3KrZt5mgWHgcS5eQ0fD9/+C5/LJbP7+unRq00JxSmMAtlpemxmlhnw1qZJ0E8ZvKxG7VQTLY9WNfcxFel2w2pDOdtyf' +
    'uArmPgRwDm/hXyiK+zFXqXoJIIB3FH5VrB54V8sRkpxvaz/NMF4hBeWbIlGeF6RTqxsceJR5DmlRqzP2lsrLhHHzIlWibBUjVpYy' +
    'lo4pnPpvvNX045gVfsGdiahgblGuUrxvjX6tMK2fJBVMwDCXoT13GPeGmrPeyyfj30/Wz84cAHdL29CMj2K9eckyZz9ZzCJ2kipb' +
    'oYiVZKTtE5EfpfrWtlw/SHk4zkVchdMRUjFF8ApmYhsysQczMcRyUnyZMK29wuHD8HLstFAxOc4fyyko3woJOdeRTGso1jq487NR' +
    'rTvthB1q667jezFmrnncMh8rpdOpiT1x8dykKaEkjV8F4wG3oyqAEqiDHtjr6QXMxA4AzUPbW+SEhahlmqsrXFS9cSauFrrjWgsV' +
    'E8DnACC5csgqLJSS9SoflPcTUa6DRdEbK8PyNA5VlUgiUrZUHW3ysVM6HScjmOtRJ7bVS0WMVWA/kdf0i7ndxEysv+uX4ARqIxNL' +
    'hB5XGprOZ1mlaD7CL75+LT4UXvEhgMWeX/SZUtKu5YOK6RETtTEZDXEfnsU9qCu1gex2qbLJv4L1bZWaFbNs8rFLKpVXXTy9mN4s' +
    '59WgCwFvHuXM+o0bBGm2d/kSdAGwzuL8WdQw3Kub5fVm1LNtdCcJ19CM8vyij5OU920SezQ5C2/EZedcztvMHdLpDcMhD+MbJ1wP' +
    'W2dT0LX55srYfUjZg5QfeEjDzOP+GYtH9a4LEb4I4Amba34xtEues7h6Xdi1HfAWfsI51yrmqAIjw6HSMi+NiSZL/jJxzOWd43O7' +
    'leNSZXtdOr0lCCAtbDNb+Sdil49vbFKoamtEKAonY6WzdIsmXBk6mj3vfqPLVHubFvopixiFJatGTugNoKKEJehoB60Y/QTx/dLG' +
    'bEkW80GZHlWMM3uHAngYIzER32EmXkQbVEYr13feFJcqRk7esrujZ4/cpbpaVXe1bT6GWMZ/2nXtOY96kRtXmY+BQWsIu1GGHHPm' +
    'J0JtgCQX92xtWugzuo07vLVjpgaX4cvtTjQYt2u+QlbT6L10OfpUWsXkt3SZ5U3F1PD0/Gt5MnSU9ePTAINjZisV2bI1kErtzdD1' +
    'mz30B8RBrAiu8bT4ZEgkRZ71Gq4WFMZcxRQLHRvu+H71Bf457LpdTsZjKjrqd2evZVqPSRgsaGFlhbK6HC2SVjHJlq2tEx6qijfz' +
    't+KOJGSmnOXIGi0YEwN7G8nvYiEzjJ5PZzbnfBfK/DZ5OCaM+Zqn53bY5nOumMKhKj7W5EsjWpQ1Q0LPmlEBR1yabBd1vM6mHtQO' +
    'b4Zb7G5VomJexcCofY1WeF7/JdOKvVbXMWwdVRVTwkHpWtqmFm4AeJ2lOqqH+zAU/XRruBc5NgsohRdwON7mAp/UaM1bJFVMR6Ed' +
    'qxWFLKYMy9rG3iQtwiznC90Vq5h+oZxchRooZFgaKFYxhWxWBU10maMDrpfJAcAEBTJ5UeI+Mw2GCQ9GTcU4cS6+1yatFoYYa4TX' +
    'DjJ8rrIGW62MIheZzApOUvDMdkdD8LuFOw+Jl5afctxchmDJetZIjD2jEMABPIKlksv4n1KsYkob+t8yYRuAwhbnVwMw8xZiH46h' +
    'modnPkCRVOwmbB8zjZWOp6Oyjd7Vjso2z6JD0dZ0FMus5VPJZFli1v4RANBGcO/ZukUMTfGRAjPNrPBWNFSMvpjfapwrilXMx5oz' +
    'V3n+ap6ViD8Ci4Jrsm+wEXfWmujnlSqY7NkkZ952P0KSjYo54irdAE6jtocn3kqZXLZZWno3snzmbyhxLOqElg5Ltw7lTdN5TqgY' +
    'wsmLbcLUPwuOTn4Tdny6ZmVdY4xEmk+t8YiitzLdHKo2YhVzo0MjniGQGT+xYpJGlS23Se0T4dS421DTZGTBLnxnGB43C9lf85r4' +
    'wNbGJudZVEAlNHDpHKqBUocZYiXTFmdsY//XU1vMKW429x2vs99NwsPYYnF1uIOL9yGzBU8htMIQDMMw3B16pg0xQmpVuBuD1ChQ' +
    '19BftncmudeB7zX7nRztvb1rVZz9zoY/oIfCx6L1FbNPOtaR0MyN1VUldHMMPS2+elnrS6ZhgmZRxBbTZRBW1FTW5M6xIuljeLWu' +
    'd/A6z4zYvo2HXJbwLPZiJTZKDLTqHX7YbyfcxDSf99jUAi/hX9EaCPvEsACrjE2MYbopXysPGzdLFNxOSRXFSs03O823ByAKX4Xu' +
    '/bbjtk9xh+236/EghmAcvscuXMRJbMP3mIDXcCeamiy8OOvIz2w/pX6R9Up9BB7F7XgWk3HAhSHfA77X8b4RqCefOpxcNrpr6KYb' +
    'G1UfboiWiiljMvJsvS9eZd3VP1oYGMm4bNhg+2oEsCw4/NYm4gomgAAWB+dvGjtejVxKieOAUrZzQJk4i5PIwBGkIxX7sAe78DO2' +
    'YiPWYQ1WYpmDFlg0wmEM9nGNc72IlGGu7p4bJGKU0sy4PunRUkkmtI+ezcALJtN25R3YVbyPm00tEWT907ayNJk6Fly5XA6tHHk1' +
    'URlWBO1A0h2u47Fai3Jc8uk8KDGukTvCeF9Wz9RzvRbLWRjo2JbrfkE/wmvYK1BwvaJp+XjKZDG51Velp0kBVuFttA/FyuvAzPmI' +
    'RddsdoxU/28BAB/A6LVlkcCdhHkLMSfI7CJdzDDnkNvD0pBnQDX0VOwRWhQelp5PywlZrl+HK2wLPhQaoE5CUzyPo7rzryCKvGza' +
    'gRHvD1jEoqA/41M8JuHqT2+6lE/ZPIBf4SNUQbOgbeuMYMU9hVfwmeD6dzHM0upli+1TaeHZmjM+wyG8jHIKPpyPRaDzkbW0MNwq' +
    'prlUvM8A3KQsF6NQHdegCepptqvJi6GaBZNLIqlSLgn7XdzUJHw5muM3QQrfoIPiPB3AQRxCKo4gDelIx3FMQhvkXs5hKU7hJE7i' +
    'FE7hFE7iFE7iaOgrNCKaDdsYYCbGYJ6rmEXQHh0jtpfAcbQwjCe2NrGTMTIdg7Dap90cLiIDx3Ecx3GJpl1YCfulYo/2w7PhKEv7' +
    'DiPtEvL7GomwAe/gHvxCSSCAs1iM/+B+XG1bf6uiGZ7AKMyPUMslO/xi6jGmtVTc2Qp203IWRkrpgk4IoI/qVgxQAQdMr5wm7Buf' +
    '1O2CRIifXMRmrMMm7EM+5A2FZKQgBSkS69z8YTXuwElTFTM7RuV4ClMwzWaz4n1IwXlUl9gz3ZGKASYIFqmNCa6pCOeDBG/Ik0Tn' +
    'W3QRDCRcb7u9X3RJwxR8ITAX+Sq43+d0dDScq4IbUAG/4QRO4DiOSU1ZaLhK2LwyOhusjw8jsE0JA0PshtEW71JSXJRgsW6vjKx8' +
    'a7fkDfdjPNQkjV0Y6cRCWzwLpPcTW5IVjCHBwwCbd2ltnJRjgsZgJG+YAUaqZv9SK28JARzGCLn18w0sEnlZc10zVjGGhA73SNjj' +
    'xEtZLmAYSqITpppYx/UItW6W2aazx8JNrwYrX1yvhq56mpWMIWHDaVNb9nDyR3y2yI+QvThIdnWehLuI2ywTyN7kycrg+fUImWsz' +
    'MEQjrA9bWtNc+C7VNfXNvB0ve9znNLKhBICGDq7vZzWjlMVsSx+rr2MwgLUWvkpnBD3PEZL7+BTddb+7YYjFnpD50R31UB4XcQ7n' +
    'cQ5HMAu7UDS4uCQ+6I0PsdmRE7T6WTNVl1hc8qqlw8wRGICLrrY4ISQWWI3vXcbcG9yPPJt/YZHNu2RGF0yOI2ktxfigjz55KdVB' +
    'pt1Fd1hOSE9jc5khrsMoJZ/ImkH/O+UdxnsqzqSV7jjGRAC41FII36E+tgvP3s0PIYlr+mCLwSLEKaXwQ9CLkNN9rdPiTFrOLae7' +
    'orqdigH24jnWRJJrqYYNeN5D/Lz4LuS2zemu1psSQL7tgMtsLimORTqzG0JyG81wG1ZLOwbT84nGfcNmh04STuJS1MPluVq2yRhv' +
    '14p5i0scSa6nCbZirOVWLeYU0A0WOOko5cGD2IoXPG20Fw/cgDLWrZhGlusvCMktXIr6eAJVcCC0Z4QM9wQXCmZRHReC2+7Zfdmf' +
    'xDQ8ILHDR25gr/VE2xIp+0VCcg9rMRmrbNdHJ6MWaqCPYbB4Mboi3SJeaTyFXrm+7aJlnJWKqetot2pCchMrsBo7sQd7QjM/lVAD' +
    '1XEVaqCGRQskDfVxzPRMdQwMM9hLBGZYqZiJ6MqaRhKe3/ArLqK+A+Vk3HytKfrnauewYpaKVUxJpCMP6xchjvkQvTW/OmCg4/06' +
    'cw87xCrmcXzEukII8USGeNK6EaVDCPFICbGKaUzpEEI8ckLcUQpQOoQQj+wWtWKKC6NcYgjdKUdCiCnHRSrGyc5091GOhBDzjpJ3' +
    'FVPSydYGhBCqGAC4KJ1EV8fevgghCd9R2sluEiHEMxvFLZBDmq2bduNw6O9bdFfVwA5KkRAioIh4icAazQ4CIzBW2E0ihBBzFuO0' +
    '2PRurlQSD1CKhBABs6x8986TSOBGlKMUCSECZlipmDRsDv0tsvTlHgSEEBETsd96B4Jxob9Eg8KdKEVCiCkH0QewVjFjNfNIZtTT' +
    'zDkRQgg0PZ+7cNZOxfyB4ZaJtKUcCSEmHEfLbFfp1pucfGRp9UIVQwgxshzX4IfsH9auM//CPZpBXz3lUIeyJIRo2IfNWIxR2kN2' +
    'W7VtwRCYzyh1oDwJISHGIhmV0V6vYOxVDLAC5jNK7CYRQnKojkyzw9YqZiAOYLHpmcJ04UAI0XCz+RZ0YhVTAkvwJioIzramRAkh' +
    'Opo7UTFlsEGz2axxLKYN5UkI0dFCXsX8AzN0q4+MYzEtKU9CiI5W8irmSTSwTOrqhNr4mxAiQzlcI6di/olBNklxjyVCiJEb5VTM' +
    'HRZbnAgTIoQkPHXkVExzN7qKEEIVI6di6tokUwxVKUtCiFsVU9YmmZsoSUKICflRRUbFVDQc0dvFcLCXEGJObRkV85vhiN4upgnl' +
    'SAiR6yqZqZjzNonUoxwJIe5VTKZlEhVwOeVICDGlqoyK2WKZRHVKkRAioIyMiplFFUMIcUUx/MONitHOKF1JKRJCZNsxZirmGEaH' +
    'HdHOKF1FGRJCvKgY4IWsHVDYUSKE+KFiTqEj/jA9cznKU4aEEG8qBliI9vjL5Di7SYQQBSoGmIuqGIkz7CYRQhxQRFbFAAfQD4VR' +
    'C/fif6FjZSlBQogFSfqfeWwjbMM2za9kSpAQYkFe+VaMGVQxhBCqGEJIbHSUqGIIIWzFEEKoYgghxGNHiVu0EUJ8bMXkoQQJIf61' +
    'Yn6nBAkhFvzpTcX8RgkSQiw4SxVDCIlZFcOOEiGErRhCSJQ4RxVDCGFHiRDCjhIhhFDFEEIixiFvKuYUJUgIseAXbyrmECVICKGK' +
    'IYREg/M4RhVDCPGL3eEHnKqYdMqQECLbTXKuYjLDbfcIIUSdimFXiRBCFUMIiVcVs4dSJIT4p2K2UIqEEFOO4DhVDCHEL5YYDzlX' +
    'MespR0KIKctVqJhMHKQkCSEmLFOhYoDNlCQhxMB5s2EUqhhCiBqWmh10o2K2UpaEEAMrVKmYFZQlIcTAcrODl7hKagtqUZ6EEA1/' +
    'oYCZV8xLXSU2l/IkhOhYau52152KmUd5EkJ0zDY/7K6jdBnOID9lSggJUQn71bVi/sZ8SpQQEmKnuYJxq2KSjOspCSEJzCzRiTwO' +
    'E3oELVAH1ShRQoiGOaITTsZiSmMSmlGWhJAwzqKQ6JR8R6kDdlDBEEJMmC0+Jatibsc3KExJEpLQ7PNLxVyOMZQuIQnNn2iNmaZn' +
    '/raylJMb7n0O5SlhQhKY33EnFqCi6bmlOOtNxVyGfpQwIQnMRbTCEog2B/jaKqqMimmGApQxIQnLebTASkCgYv7EFKvIMmMx7Shj' +
    'QhKWs7g1qGCAVPxlOD8Pp72qmPaUMiEJyjLUxtrQr79Mlgl8bp2AvYppgNKUMyEJyGk8gqY4oDu219CJmmmdiP1YTH1KmpAE5Bv0' +
    'wjHD0XAVMw1/elUxJSlrQhKMw3gU35meCR/wnWSXlL2KKU55ExJRliIAoCquEHZg3gv+9Q90QYriu2/GB/jc3IMdgJ26X6n4yfsN' +
    'v0CAgYFBcdiKEsE3LN1wrhyARy1ja5VPF+xXlqsvcKONPkjRXf+qvQKxH+5lK4YQ9VyDxcFBiIDhXB2Mw1jL2M01f09BCgbghMf8' +
    'HMKLKIO7w/YXaYKuGIRuuC50ZD8uaM5/rkIU2/jFYWDwJfyM0qiNs4bj52xjfmJ4T5Pxkstc/Ijn0NCQXhWMxnHddTsxCACwJnRk' +
    'rYwCsfcXk8r1SYT4xDGX0yn/M1EK9bDeURpr8SMW4keTM4UwGvebxtmPQWiJbsFffTHK/jb2w70nqGII8Qm387WlTI7920H8R/EV' +
    'zgjOXYsZqCAciZmG86FfU2VuZT8Wc5T1gBCltPU8cmJUMW9guIP4b+BWwZnaWCZUMNldsix6IEONijnGGkGIQmZhFm7ymMYfYb8/' +
    'xrOO4hfDdHxqcrwiFkhuX/SYzYC0g44SWzGEqORjBWn8rPm7CL5y5fK2G/LjrrBjn0p33RbJ3oatGEIiSSrmAbjaYyofaf7+wbVP' +
    '7c6YqPvdHP+SjttfnYrZwFqh40GKgHigJwAzWxgnnNCohgkamxXndNWpipcclUPh0qLTtGAIhb4oQikwuA5DQ2/VPR5SeTOUylOe' +
    'c3QRlYJplXUY8yckqVIxU3wS93E8j11xVUG+DH6BIn1Xvpq5I+jdHiw3vSYTI3Al9lmkcjK09KCSklwtDKb2kIuYEkrmMqkh4U6+' +
    'NBnzoRmKxVETdyvuxJ8AnkC+CN1xNl5EN0zBDajKHkbck4nnURYpoQDcbLhmH/piAwpgN+4QptMDq0IDx9coyFdl7MdmAB1M8mMX' +
    '83csVSGagvz+IIDpIQ/GkWp5bQw9geoKF7oxxHdYGKoV9ZWlmbV6+l0XMSUmg2RaMb8jv+36y3BO4f/wT8fKbB+qYRrmYxW24jAy' +
    'kSdk5hNtBuHJkC1CXdSLyD1L4wekBYf33sX/ORjtJ7mVtWiHi8G/30EtRakWx2c4jdIuvHTnx1Gss75Edk/r7ajp6NYDcS3udZzh' +
    'jSYvbzWURwoqoCLKIwVVkIrd2Iq9qIa+EXqsx3CXzitGEyyL0J2n4D5dRXgEjwt2siG5lfOaz+wCtEdm6OXOQF6F81wfoxp2u4i5' +
    'B9XUZKGuo+ZTGpLQ2kWza7uDHD0bsabpbYZ7R26Q2mgo3hrfsbuQMCEN+fEYxmMe3kJnXT3oovQ+/wUAZLiKW12Vnhvs4KYtXU52' +
    'H3eQn08i9piNrbHnfLvXSuEkp7552g6fuawQDPEU0oX1f5LS+8wLTi+4idvV+kW9VPqVfg3PSL/88wFY7RGXijF4D19pBjSzcDK/' +
    'VC1iTdUShiMTHcwiPI6SqIyBQkeFevqHyaSnINUZeBAl0BAvh3a4IbkRsYleA6X3KQcALutSdZUZqYtfbHXastCUbjPDufOYg766' +
    'UZ3KeAkXNVdc72CEJFJfkudM7v69ZNyc9ayVsEPi+rm4NexIZ1tJFEB7fIhUyRx9jXfwBZbhV7YR4rgVU0zxfU4BAG5xFXeyWq2a' +
    'hOE4b3G7Vbo5oFW6cwtQSDC7/lPompdjcCLdrPUmZ5v5vi5OYUM3yCy0wPwwG0pZyqMzRljcYxG6G7YObh0XvplnohoGYFECqpht' +
    'gmfdUvF9spxl5nMVd7n6xlsh9MNMHDSZIw+f46mjOTvSMs0Jwas2SeahVwQfc3dTVSsz0lQjLFYR7LWN0wW1w444n5q8Dr0xHiuw' +
    'HxeRhnl4HV1Q1uJ59sA8XVsy3M3jWDRGoai9ZhdDs2gFcT/mJYx6OYYBwjmj5xXf61Aw3aUu4u73r59YGDehJ4ZhGIbhWTQxvWZE' +
    'MBtf2aY2I3hlK4k7F4joUKe5tcDHEj5RjdS0bAMGEMBjGoWbMwy+Az/gaZ/9DzbDm2FtoPOYirah89EaXh5qsOLoJdUejOeQgWcs' +
    'bcjfV+5FOIsWrltAUSMZ6QjgYnA4yYorgxk+KGFu91ZEH3dT0zzcYBuvj2m80hhkOQ4yAEA54dnPfN86LwlN0QX98DQah51ZHZWX' +
    'ba8gn5UxBLtzpXo5jL62Fi/TFN9zVSjl5S5iR9lAtiMCeF7qys9CA8YFLa+7JsKPvJQgH3ZD31Zj/rcKF5dmeWAdZdEszRulJ9nP' +
    'dJHDeLyFuT5Kv6Vlnm7G9FylXnbjUaln8aPi+84LpdzURexK0Z54Gy15Xc4mUJstugRVcCQmvqLAAJuYdgy1uNt6i3TfjNJzTMKh' +
    'sLmp8hq1v8kX6cvYUVfGe7bdTz/CDsxRmt4KtJd+FpsVl0W7k8A7jmM3jB8rgJWaIca+gq/WwQhXJLENTCnLeAtsS2vW781aC3a3' +
    'TT89WtTRKJlehpG5LT5I/zvpGcankRahGpGJWeiJFACNlaX5pUM7F9VvQRdd6k5nGW+PHxUzXpfxtbhN10m5DuOi8K3qYZHfOR7N' +
    'qncIOgV28051ovaESuJdrMIR3GJyrqzEFmNOw3xHueuE6TjjY104gnd0y0lqKJkuft/FrtSqrZrCc+BsZumu+FExz5hOma7BEiyR' +
    'MPrzJ5S2yG9nYayBUuVtgBOaVSLVpG1uYvWroX7d2AIXuWiEF8MsstSENYZRuSSLqX6ZcBD9bcYdRexSrDrNhgHOCk1RnzKZBY0T' +
    '7oy54Tc7y8WTprHWOmgVvIFv8C7KaI7Nt83VdTH7BL2Pk6VjBBpgavDXYg/WW53xsbTNs/b+G/EDJmMkPtcdn2R6lwWuy7nU07df' +
    'bad0nOk9iuBtHAi78pvg+NvPhllQIZfEVAW9Erti7JVpYKMuRqO3qfXLDtd3LGux9C3n4Z+OURXzPp5wHfc0vsK04OYZNYOr7pcJ' +
    'TAbkKYDiKI4SKI7ieCXM1mQp0nAMGcgI/avfIbEouqA4jmIHdgg2++mLd13kaRpe0W1T4pwljj3UWXGjxeqkomiAWjiDg0jF/pAr' +
    'Cf3mtq8KluvGIA1irA3zjdSUfHgY5EkG9ov0d8TwE7zV5QDqVLQOS+nL4CyLOm4xDLGq4GFhh0IcvNs2TVY6Ue6u3DkpjIifjtJ9' +
    'MaVgzloY3WfT3RBrnUcZvGSbrwkx/QxPOJTyLHQxtfSphQACWK0wZ/rB+VTDei23VHQ8v7PFsy/mF31e5ivDQ0FTgcOed4WKIC8p' +
    'VRHn8TW6oqKhP6liLikboznaVR5lYL/fQ6eYfoa/Ong+PVDEIqW6LmZaxNSQstl2x8uO69YZF04stbRRuFShiOtcJKEhqiCumKas' +
    '/TEZbfCPYKoN8beLNKZI5fi1sFiDPctgvE2+TofKFYvIL5Y858Bxh5pRIu3dhytLt71rS9uPPOxkUUmZinkUCUSy40a2WZiDjoaU' +
    'pzpOZbZknj8Mm4T0zgMO7DBjjy+lPwKRnhXTzv2p2eG0MAZ5NIH7VbB4WIa9ShTMWiQUz3gW2DRTxwfFkOkwHXkfLfpuTS8FUshv' +
    'U3nuiNnnlyK9Xugkro1w3jpp7n5CwZqawngdF5S85G+7zMFABfc+I/QdWTg3Kpi8Hv3YfSb0zf+2w5Tec7CR5jydRYUaGluuuJkS' +
    'k0/vPQff82OoHfH8aWdgvE735sMg15swXzBd2Hq/q3xs922JaTecUjpWFSN42Z13IxoJ0y3jyAJzp8MKuEYTV92mK8XwloUhfPkY' +
    'fHq1pDu5y1AhCvlLVzb20AdHPS03HCmYY3I+/OvVxENkgd4oOBh/fe5SMFVdOzw6aVNpHpZO6SuNp11ZdmtG5lU7WWiP6diEVEOb' +
    'JjatEGpLKZkhUWohZ9//WU/p1MVOBdbiDwrObXM8VzjSl6nqnaEO5ZW5R8FUdm14vsnWdsV+Inw42rme2T/ucFWSO0ZD72gyNnvK' +
    '5fCDzeBmgyjlrEQwB709pTJIwejHwmD7QzQo4HTX1Q9cdtfaClMcornugNBXUtzxrcsHNhv5bdO232/JCzmuL/30/FXV1SLLaPCQ' +
    'oBuxK8qTo9eij0dzty+VDO5uDnXf15ieb+M4X91c5OJOYWolw6ZG1iHX4GbzM7kOg53VwhoPuS6o0B7GmtlhrhdjmYd1q+JTMd/i' +
    'mxkfJGOxIisU7Uons2mI+1zk7jrNSJNc+ESyvRxAAGNyj5KpptnqRKXJ0BIFNrwiKoRSKeazdMLX/jwQ40+zMKrjxghup+cnxbFO' +
    'oc25lmYG5eCuNiahA6baTKJn6FZHi0ZZzuV2y5kekk6NMixmkMKxsxgu6CG/dUPmfv6jX76/HSRSrFC6rKVQmCr+r+7sMx7ymYQO' +
    'GI6JmI+NSEcAaViC8XgOd+E6JAPIqxk5nGaaQlETS7Ok3PY4r5Bw6rda513Fjnct0/pUSduiSwQkE77gsgXf/YgwSKmCCZis6Wmi' +
    '6Vh287UsL9p6ToyF+b8I0NTC4c5+043T3FaRTI92nh2CFgSR2RMgw7M/OOKUOsrX75tbmzREf3TwfUlhMU1napbpFWc1Szw65u5H' +
    '+7iJlcVmwSby1txk8bi9OgR8BAEE8HmEZPJyzHjwTRy+jvCmLX6jHc69weR8Y0zGGQQw2dKhbC6hCJ7AdziLc9iHdRiD+q5T2mu7' +
    'd4xbstaJtIqQRAqHufGcRA3gM1598wYUzRmpo4rUgtrqfPTOGCrwVlLcc8rDI7zlyGNxsJQgN9HWB0dnfaNcphz7nrmRueGlCVBR' +
    'RuCYydH8np1HAUUAwdi8P4wNc0PwFLWAr9TwIc2iUS7TG5FuqySCivlT4Nerv5LqEtmVz3p3EY8qcw5JzPjbhzSLR7lMG0KuSirj' +
    'MqoYNRQU+Im707PRf1GkaTYcjwRrdJ57C+Bx6gEf+cuHNItFvVRvhf6qxkeshstdrNWQY730ft3qKKHzeJ+GPHzAvnGrD2MxsWBs' +
    'sNn1iii2Ykz5HScFZ5p5TLmIUg/5cmTgBc2vKyJi9peoLBLWnHhuxQBvshWjvqqI/Px643SU/K8v1DnRIv7xgfJWzIGYKNevuW2J' +
    'Y7QZ5FOj9XiUylNIZ+vzbz5g3yiP3xSrmPMxUa6eCCAQ3HmTKKCM4HF72w+wKGZErURXahxvfs8H7CMvKG/HxAZHETA15iAuedL0' +
    'Yb/iKc3KHt00eqOFphy1+YB9ZLFiFVMmJkqVZZlen49XHXVNqkpXTynWj7KX9n6a3ReIfxTBHqUqpqOHLdrUkYxTnj+yxEAJNMKD' +
    'GIwncC9u8zxUe1vUq8rEULW9gg/XR6rqDAVUhKWeZzO9MxgBbOXDje2KF33GBKvsm3wcvlLD894DxtAqymVKRgYCLnbdIAnG08F9' +
    '/ZIpCl/Jr2zH9eywO+pl6o8ANvLREvsO2xkEFKy4InZ0wH4HKmQPBttcQc+FJE6ojl/oPSYiJGEwDkkpmMOojMI214ymQEm8UJDG' +
    '4BHkXiyzUR7rg1sITrW8agZFSQgxpybGCHzincN7Ib/9zW32904ALmFdIcQ1tVEDNXEVaqA2TiED6fgCk5CpueIgygljz8UdFCEh' +
    'xAvDLFoxEygeQog3yuBvoYrpSfEQQrwyW6BgzsWE7xhCSJxzp0DFdKJoCCEqSDOol7E0MiCEqOIlg4ppSqEQQlRRBv8XpmJGUSiE' +
    'EHXMCfonnBnaOYIQQpTRJrQHeX2kI4AAGlEohBB1LMU/g3/dgD8QwH8oEkKIOpI0fw9FAAcpEkKIX+omgVxzX8rnTUiEyVIupSgI' +
    'QogfzKdtDCHEL+4OTlzXTYzi5uETJyRClMDVyBPysnyGAiGEqFUxv8fcrpC+w+FeQiJFBv6r+fUXBUIIcU9LfI71CCADW/E93kVe' +
    'ABU0rZjCFBEhxC3dDd7ubgcATAr9LkAhEULc0cfEBdWrAICaod/5KSZCiBtKINNExXwePDuHHSVCiBc+NXWkuTh4tknwNz33EkJc' +
    'cUGwx3U2yxFAgAsICCFuKCpwB34hdEWrRLKLIYSopYJAxRzRXLMVAaQkhjhoekeIWn4THN+r+Xs49B5kqGIIIZL8ITj+jebvKdiP' +
    'fBQVIcQNZlPWJ1FUd00vNKagCCFuWGNQMH8bvMP8E9dSUIQQN4wLUzC/oS2FQghRxZM6BbMfN1EkhBB1XIEtCCCAc1iP3okujP8H' +
    'CMeARRapaHoAAAAASUVORK5CYII=' };
  const MASCARA = { x: -353.5, y: -29.5, an: 708, al: 136, src: 'data:image/png;base64,' +
    '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' +
    'QmCC' };
  const CAMPOS = [
    { x: -345.5, y: -36.35, bx: 8, by: 8, fuerza: 2.0, mascara: false },
    { x: -345.5, y: -35.1, bx: 37, by: 8, fuerza: 1.5, mascara: true }
  ];
  const TEXTO = { cuerpo: 79, centro: 350.25, base: 79.2, fuente: '700 %dpx "Impact SWF"' };
  const TICK = 1 / 30;

  const imgs = {};
  function img(k, src) {
    if (!imgs[k]) { imgs[k] = new Image(); imgs[k].src = src; }
    return imgs[k];
  }

  /* ------------------------------------------------------------
     EL BRILLO DE FLASH. Caja separable sobre el alfa, una pasada. */
  function caja1D(a, w, h, r, horiz) {
    const out = new Float32Array(a.length);
    if (r < 1) { out.set(a); return out; }
    const n = 2 * r + 1;
    if (horiz) {
      for (let y = 0; y < h; y++) {
        const o = y * w; let s = 0;
        for (let x = -r; x <= r; x++) s += a[o + Math.min(w - 1, Math.max(0, x))];
        for (let x = 0; x < w; x++) {
          out[o + x] = s / n;
          const xa = Math.max(0, x - r), xb = Math.min(w - 1, x + r + 1);
          s += a[o + xb] - a[o + xa];
        }
      }
    } else {
      for (let x = 0; x < w; x++) {
        let s = 0;
        for (let y = -r; y <= r; y++) s += a[Math.min(h - 1, Math.max(0, y)) * w + x];
        for (let y = 0; y < h; y++) {
          out[y * w + x] = s / n;
          const ya = Math.max(0, y - r), yb = Math.min(h - 1, y + r + 1);
          s += a[yb * w + x] - a[ya * w + x];
        }
      }
    }
    return out;
  }

  function brillo(txt, bx, by, fuerza) {
    const w = txt.width, h = txt.height;
    const src = txt.getContext('2d').getImageData(0, 0, w, h).data;
    let a = new Float32Array(w * h);
    for (let i = 0; i < a.length; i++) a[i] = src[i * 4 + 3] / 255;
    /* blurX es el ANCHO de la caja: radio = la mitad. */
    a = caja1D(a, w, h, Math.round(bx / 2), true);
    a = caja1D(a, w, h, Math.round(by / 2), false);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), id = g.createImageData(w, h), d = id.data;
    for (let i = 0; i < a.length; i++) {
      d[i * 4] = 255; d[i * 4 + 1] = 0; d[i * 4 + 2] = 0;
      d[i * 4 + 3] = Math.min(255, Math.round(a[i] * fuerza * 255));
    }
    g.putImageData(id, 0, 0);
    return c;
  }

  /* ------------------------------------------------------------
     COMPONER UN CARTEL en un canvas, a k px por px del SWF. */
  function componer(texto, k) {
    const W = Math.ceil((CAJA.x1 - CAJA.x0) * k), H = Math.ceil((CAJA.y1 - CAJA.y0) * k);
    const X = (x) => (x - CAJA.x0) * k, Y = (y) => (y - CAJA.y0) * k;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.drawImage(img('mancha', MANCHA.src), X(MANCHA.x), Y(MANCHA.y), MANCHA.an * k, MANCHA.al * k);
    for (const f of CAMPOS) {
      const t = document.createElement('canvas'); t.width = W; t.height = H;
      const gt = t.getContext('2d');
      gt.font = TEXTO.fuente.replace('%d', (TEXTO.cuerpo * k).toFixed(2));
      gt.textAlign = 'center'; gt.textBaseline = 'alphabetic';
      gt.fillStyle = '#000';
      gt.fillText(texto, X(f.x + TEXTO.centro), Y(f.y + TEXTO.base));
      const capa = document.createElement('canvas'); capa.width = W; capa.height = H;
      const gc = capa.getContext('2d');
      gc.drawImage(brillo(t, f.bx * k, f.by * k, f.fuerza), 0, 0);
      gc.drawImage(t, 0, 0);
      if (f.mascara) {
        gc.globalCompositeOperation = 'destination-in';
        gc.drawImage(img('mascara', MASCARA.src), X(MASCARA.x), Y(MASCARA.y), MASCARA.an * k, MASCARA.al * k);
      }
      g.drawImage(capa, 0, 0);
    }
    return c;
  }

  /* ------------------------------------------------------------
     LA COLA DE VENTANAS, como MadnessPopup.pendingPopups: una a la
     vez, y la siguiente entra cuando se cierra la anterior. */
  const cola = [];
  let actual = null, acum = 0, el = null;

  function lienzo() {
    if (el) return el;
    el = document.createElement('canvas');
    el.id = 'cartelLines';
    el.style.cssText = 'position:absolute;pointer-events:none;z-index:15;display:none';
    (document.getElementById('escenario') || document.body).appendChild(el);
    return el;
  }

  function colocar() {
    const esc = document.getElementById('escenario') || document.body;
    const Wv = esc.clientWidth, Hv = esc.clientHeight;
    const s = Hv / ESCENARIO.al;                         // px de pantalla por px del SWF
    const k = Math.min(3, s * (global.devicePixelRatio || 1));
    const c = lienzo();
    const cx = Wv / 2 + (ORIGEN.x - ESCENARIO.an / 2) * s;
    c.style.left = (cx + CAJA.x0 * s) + 'px';
    c.style.top = ((ORIGEN.y + CAJA.y0) * s) + 'px';
    c.style.width = ((CAJA.x1 - CAJA.x0) * s) + 'px';
    c.style.height = ((CAJA.y1 - CAJA.y0) * s) + 'px';
    return k;
  }

  function pintar(v) {
    const k = colocar();
    const fuente = TEXTO.fuente.replace('%d', '79');
    const listo = () => {
      if (actual !== v) return;
      const m = img('mancha', MANCHA.src), q = img('mascara', MASCARA.src);
      if (!m.complete || !q.complete) { setTimeout(listo, 30); return; }
      const src = componer(v.texto, k), c = lienzo();
      c.width = src.width; c.height = src.height;
      c.getContext('2d').drawImage(src, 0, 0);
    };
    if (document.fonts && document.fonts.load) document.fonts.load(fuente, v.texto).then(listo, listo);
    else listo();
  }

  function empezar() {
    actual = cola.shift() || null;
    acum = 0;
    const c = lienzo();
    if (!actual) { c.style.display = 'none'; return; }
    actual.alfa = 20; actual.aparece = true;
    if (actual.tipo === 'lines') {
      pintar(actual);
      c.style.opacity = actual.alfa / 100;
      c.style.display = 'block';
      if (global.Sonido) Sonido.tocar('oleada');
    } else {
      c.style.display = 'none';
    }
  }

  function tick(v) {
    if (v.timer > 1) {
      v.timer--;
      if (v.timer === 1) v.aparece = false;
    }
    if (!v.aparece && v.alfa <= 0) {
      const f = v.alCerrar;
      actual = null;
      lienzo().style.display = 'none';
      if (f) f();
      if (!actual) empezar();
      return;
    }
    if (v.aparece && v.alfa < 100) v.alfa += 20;
    else if (!v.aparece && v.alfa > 0) v.alfa -= 20;
    if (v.tipo === 'lines') lienzo().style.opacity = Math.max(0, v.alfa) / 100;
  }

  function meter(v) {
    cola.push(v);
    if (!actual) empezar();
  }

  /* Un cartel de rayas, 'timer' fotogramas del original. */
  Cartel.lines = function (texto, timer, alCerrar) {
    meter({ tipo: 'lines', texto: texto, timer: timer || 90, alCerrar: alCerrar || null });
  };
  /* Una espera invisible, como addBuffer. */
  Cartel.espera = function (timer, alCerrar) {
    meter({ tipo: 'buffer', texto: '', timer: timer, alCerrar: alCerrar || null });
  };
  Cartel.ocupado = function () { return !!actual || cola.length > 0; };
  Cartel.cerrarTodo = function () {
    cola.length = 0; actual = null;
    if (el) el.style.display = 'none';
  };
  /* Avanza a 30 tics por segundo, como el original. */
  Cartel.paso = function (dt) {
    if (!actual) return;
    acum += Math.min(dt, 0.25);
    while (actual && acum >= TICK) { acum -= TICK; tick(actual); }
  };

  global.Cartel = Cartel;
})(window);

