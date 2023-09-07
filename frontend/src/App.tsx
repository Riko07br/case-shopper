import { ChangeEvent, useState } from "react";
import axios from "axios";
import Products from "./Products";
//import "./App.css";

function App() {
    const [selectedFile, setSelectedFile] = useState<File>();
    // usar state para salvar a resposta valida
    //const [validProducts, setValidProducts] = useState([]);
    //const [products, setProducts] = useState<boolean, []>(); //para salvar se valido ou nao
    const [products, setProducts] = useState([]);

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
                setProducts(response.data);
            })
            .catch((error) => {
                console.error(error.response.data);
                setProducts(error.response.data);
            });
    };

    return (
        <>
            <div>
                <input type="file" onChange={handleFileChange} />

                <div>
                    <button onClick={handleValidationClick}>Validar</button>
                </div>
            </div>
            <div>
                <table>
                    <tr>
                        <td>ID do produto</td>
                        <td>Nome</td>
                        <td>Preço atual</td>
                        <td>Novo Preço</td>
                        <td>Erros</td>
                    </tr>
                    {products?.length > 0 ? (
                        products.map((p) => <Products product={p} />)
                    ) : (
                        <tr>
                            <td>---</td>
                            <td>---</td>
                            <td>---</td>
                            <td>---</td>
                            <td>---</td>
                        </tr>
                    )}
                </table>
            </div>
        </>
    );
}

export default App;
