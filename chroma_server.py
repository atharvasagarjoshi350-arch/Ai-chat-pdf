import chromadb
from chromadb.config import Settings


CHROMA_PATH = "./processed/chroma"


client = chromadb.PersistentClient(
    path=CHROMA_PATH
)


collection = client.get_or_create_collection(
    name="ai_pdf_documents",
    metadata={
        "description": "AI PDF Reader document chunks"
    }
)


print("")
print("========================================")
print("       AI PDF CHROMA DATABASE")
print("========================================")
print("Database path:", CHROMA_PATH)
print("Collection:", collection.name)
print("Existing records:", collection.count())
print("========================================")
print("")