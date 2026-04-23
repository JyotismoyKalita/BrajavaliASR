CONSONANTS = {
    "ক": "k",
    "খ": "kʰ",
    "গ": "ɡ",
    "ঘ": "ɡʱ",
    "ঙ": "ŋ",
    "চ": "s",
    "ছ": "sʰ",
    "জ": "z",
    "ঝ": "zʱ",
    "ঞ": "n",
    "ট": "t",
    "ঠ": "tʰ",
    "ড": "d",
    "ঢ": "dʱ",
    "ণ": "n",
    "ত": "t",
    "থ": "tʰ",
    "দ": "d",
    "ধ": "dʱ",
    "ন": "n",
    "প": "p",
    "ফ": "pʰ",
    "ব": "b",
    "ভ": "bʱ",
    "ম": "m",
    "য": "z",
    "ৰ": "ɹ",
    "ল": "l",
    "ৱ": "w",
    "শ": "x",
    "ষ": "x",
    "স": "x",
    "হ": "ɦ",
    "য়": "j",
    "ড়": "ɹ",
    "ঢ়": "ɹʱ",
    "ৎ": "t",
}

VOWEL_SIGNS = {
    "া": "a",
    "ি": "i",
    "ী": "i",
    "ু": "u",
    "ূ": "u",
    "ৃ": "ɹ i",
    "ে": "e",
    "ৈ": "oɪ",
    "ো": "o",
    "ৌ": "oʊ",
}

STANDALONE_VOWELS = {
    "অ": "ɔ",
    "আ": "a",
    "ই": "i",
    "ঈ": "i",
    "উ": "u",
    "ঊ": "u",
    "ঋ": "ɹ i",
    "এ": "e",
    "ঐ": "oɪ",
    "ও": "o",
    "ঔ": "oʊ",
}

INHERENT_VOWEL = "ɔ"
HALANT = "্"


def generate_brajavali_ipa(word: str) -> str:
    phones: list[str] = []
    i = 0

    while i < len(word):
        char = word[i]

        if char in STANDALONE_VOWELS:
            phones.append(STANDALONE_VOWELS[char])
        elif char == "ক" and i + 2 < len(word) and word[i + 1] == HALANT and word[i + 2] == "ষ":
            phones.append("kʰ")
            i += 2
            if i + 1 < len(word) and word[i + 1] in VOWEL_SIGNS:
                phones.append(VOWEL_SIGNS[word[i + 1]])
                i += 1
            else:
                phones.append(INHERENT_VOWEL)
        elif char in CONSONANTS:
            phones.append(CONSONANTS[char])
            if i + 1 < len(word):
                next_char = word[i + 1]
                if next_char in VOWEL_SIGNS:
                    phones.append(VOWEL_SIGNS[next_char])
                    i += 1
                elif next_char == HALANT:
                    i += 1
                else:
                    phones.append(INHERENT_VOWEL)
            else:
                phones.append(INHERENT_VOWEL)
        elif char == " ":
            phones.append(" ")

        i += 1

    return " ".join(phones)
