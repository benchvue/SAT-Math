from pathlib import Path
from pypdf import PdfReader, PdfWriter

# ------------------------------------------------------------
# Specify the two page ranges for each PDF here.
# Format:
# "filename.pdf": [(start1, end1), (start2, end2)]
#
# Page numbers are inclusive.
# Example: (34, 39) means pages 34, 35, 36, 37, 38, 39
# ------------------------------------------------------------

pdf_ranges = {
    "sat-practice-test-4-digital.pdf":  [(34, 39), (42, 48)],
    # Fill in the ranges for these:
    "sat-practice-test-5-digital.pdf":  [(34, 41), (44, 50)],
    "sat-practice-test-6-digital.pdf":  [(34, 42), (46, 52)],
    "sat-practice-test-7-digital.pdf":  [(34, 40), (44, 50)],
    "sat-practice-test-8-digital.pdf":  [(34, 40), (44, 50)],
    "sat-practice-test-9-digital.pdf":  [(34, 39), (42, 48)],
    "sat-practice-test-10-digital.pdf": [(34, 42), (46, 52)],
    "sat-practice-test-11-digital.pdf": [(34, 41), (44, 51)],
}


for filename, ranges in pdf_ranges.items():

    input_file = Path(filename)

    # Skip files whose ranges haven't been entered yet
    if any(start == 0 or end == 0 for start, end in ranges):
        print(f"SKIP: {filename} - page ranges not specified")
        continue

    if not input_file.exists():
        print(f"ERROR: File not found: {filename}")
        continue

    reader = PdfReader(input_file)
    writer = PdfWriter()

    total_pages = len(reader.pages)

    print(f"\nProcessing: {filename}")
    print(f"  Total pages: {total_pages}")

    for start, end in ranges:

        if start < 1 or end > total_pages or start > end:
            print(f"  ERROR: Invalid range {start}-{end}")
            break

        print(f"  Adding pages {start}-{end}")

        # pypdf uses zero-based indexing
        for page_number in range(start - 1, end):
            writer.add_page(reader.pages[page_number])

    else:
        # sat-practice-test-4-digital.pdf
        # -> sat-practice-test-4-digital-math.pdf
        output_file = input_file.with_name(
            input_file.stem + "-math.pdf"
        )

        with open(output_file, "wb") as f:
            writer.write(f)

        print(f"  Created: {output_file}")
        print(f"  Output pages: {len(writer.pages)}")


print("\nDone.")