import { ChangeEvent, useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
    const [selectedFile, setSelectedFile] = useState<File>();
    // usar state para salvar a resposta valida
    //const [validProducts, setValidProducts] = useState([]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleValidationClick = () => {
        if (!selectedFile) {
            return;
        }

        axios
            .postForm(import.meta.env.VITE_API_URL + "upload", {
                csv_file: selectedFile,
            })
            .then((response) => {
                console.log(response);
            })
            .catch((error) => {
                console.error(error);
            });
    };

    return (
        <div>
            <input type="file" onChange={handleFileChange} />

            <div>
                <button onClick={handleValidationClick}>Validar</button>
            </div>
        </div>
    );
}

export default App;
