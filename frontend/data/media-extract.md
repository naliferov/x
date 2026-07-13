mine structural narrative elements (dialogue, scene/setting/nature):  
  
text → **BookNLP + LitBank/PDNC + sentence-transformer embeddings**  
film → **WhisperX → PySceneDetect → videogrep** (Descript/Reduct = no-code editing)  
music → **librosa/madmom/Essentia + Demucs + AudioStellar**  
paintings → **CLIP/OpenCLIP + museum CC0 apis (Met, AIC, Rijksmuseum)**  
  
**cross-media glue = shared embedding space** : CLIP (images), sentence-transformers (text/subtitles), LLM (thematic ordering); index all in FAISS → retrieve "forest description"/"city scene" fragments across books, films, lyrics, paintings w/ 1 query
